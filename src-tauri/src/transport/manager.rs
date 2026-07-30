// The transfer core. One iroh endpoint + blobs store per app; at most one live
// send and one live receive, each reporting through the injected `Emitter`.
//
// Send is passive: files are imported into the store as a collection, a ticket
// is handed out, and the iroh Router serves fetch requests. Progress and
// completion for a send are derived from iroh-blobs' provider event stream
// (RequestMode::NotifyLog) — not from polling — so there is no data race.
//
// Receive is an owned task: connect, learn the total size, fetch with iroh's
// native progress stream, export each file to the destination. Cancelling drops
// the task's future (prompt QUIC reset) and emits no terminal event.
//
// No process-working-directory games (croc needed them; iroh does not) and no
// per-code folder for resume — iroh-blobs resumes by BLAKE3 hash from the store.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, Weak};
use std::time::{Duration, Instant};

use iroh::endpoint::presets;
use iroh::endpoint::Connection;
use iroh::protocol::Router;
use iroh::{Endpoint, RelayMode};
use iroh_blobs::api::{Store, TempTag};
use iroh_blobs::format::collection::Collection;
use iroh_blobs::get::request::get_verified_size;
use iroh_blobs::hashseq::HashSeq;
use iroh_blobs::provider::events::{
    EventMask, EventSender, ProviderMessage, RequestMode, RequestUpdate,
};
use iroh_blobs::store::fs::FsStore;
use iroh_blobs::store::mem::MemStore;
use iroh_blobs::ticket::BlobTicket;
use iroh_blobs::{BlobFormat, BlobsProtocol, Hash, HashAndFormat};
use n0_future::StreamExt;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::rendezvous::{client, code as codegen, pake};
use crate::transport::error::{StartError, TransferError, TransferErrorCode};
use crate::transport::event::{Emitter, Event, Kind};
use crate::transport::progress::{self, RateTracker};

/// How long a new transfer waits for a cancelled predecessor of the same kind
/// to finish unwinding before giving up with `Unwinding`.
const CANCEL_GRACE: Duration = Duration::from_secs(20);

/// Relay configuration. Tests use `DisableRelay` for a hermetic, offline,
/// direct-loopback round-trip; the app uses `Default` (n0 public relays).
/// `Custom` (self-hosting) is wired but not yet exposed in the UI.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub enum RelayConfig {
    /// n0 public relays + discovery (needs internet).
    Default,
    /// No relay, no remote discovery — direct connection only. Hermetic tests.
    DisableRelay,
    /// A self-hosted relay by URL.
    Custom(String),
}

/// Manager construction config.
#[derive(Debug, Clone)]
pub struct Config {
    /// On-disk blob store dir. `None` uses an in-memory store (tests; no resume
    /// across process restarts).
    pub store_path: Option<PathBuf>,
    /// Where received files are written: `dest_root/<ticket-hash-prefix>/`.
    pub dest_root: PathBuf,
    pub relay: RelayConfig,
    /// Rendezvous broker mailbox URL (`ws://…/ws` or `wss://…/ws`) for quick
    /// share. The transport itself never contacts it; quick_share/quick_receive do.
    pub broker_url: String,
    /// Bind the IPv4 socket to a specific address instead of `0.0.0.0`. The app
    /// leaves this `None`; hermetic tests set `127.0.0.1:0` so the advertised
    /// address is loopback-routable without a relay.
    pub bind_addr: Option<String>,
}

/// A blob store that is either in-memory or on-disk; both deref to `Store`.
enum Blobs {
    Mem(MemStore),
    Fs(FsStore),
}

impl Blobs {
    fn store(&self) -> &Store {
        match self {
            Blobs::Mem(s) => s,
            Blobs::Fs(s) => s,
        }
    }
}

/// One live-or-unwinding send. `cancel` aborts it; `done` fires once it has
/// fully unwound and emitted its last event, so the next send can take the slot.
struct SendSlot {
    id: String,
    total: u64,
    /// File names in manifest order. Shared with the provider task, which names
    /// the file it is serving in every progress event.
    names: Arc<[String]>,
    cancel: CancellationToken,
    done: CancellationToken,
    cancelled: bool,
    // Pins imported content against GC for the send's lifetime.
    _pins: Vec<TempTag>,
}

struct RecvSlot {
    id: String,
    cancel: CancellationToken,
    done: CancellationToken,
    cancelled: bool,
}

#[derive(Default)]
struct Slots {
    send: Option<SendSlot>,
    recv: Option<RecvSlot>,
}

struct Inner {
    endpoint: Endpoint,
    store: Blobs,
    emit: Arc<dyn Emitter>,
    dest_root: PathBuf,
    broker_url: String,
    // Kept alive for the process; dropping it stops serving.
    _router: Router,
    slots: Mutex<Slots>,
    seq: AtomicU64,
}

impl Inner {
    fn emit(&self, event: Event) {
        self.emit.emit(event);
    }

    fn next_id(&self, kind: Kind) -> String {
        format!("{}-{}", kind.as_str(), self.seq.fetch_add(1, Ordering::Relaxed) + 1)
    }
}

/// The transfer core. Cheap to clone (an `Arc`).
#[derive(Clone)]
pub struct Manager {
    inner: Arc<Inner>,
}

impl Manager {
    /// Build the endpoint, store, and blobs router, and start the provider
    /// event pump that turns serve-side events into send progress/done.
    pub async fn new(config: Config, emit: Arc<dyn Emitter>) -> anyhow::Result<Self> {
        std::fs::create_dir_all(&config.dest_root)?;

        let endpoint = build_endpoint(&config.relay, config.bind_addr.as_deref()).await?;
        let store = match &config.store_path {
            Some(path) => {
                std::fs::create_dir_all(path)?;
                Blobs::Fs(FsStore::load(path).await?)
            }
            None => Blobs::Mem(MemStore::new()),
        };

        // Serve-side events: NotifyLog gives per-request transfer events
        // (Started/Progress/Completed/Aborted) with no reply required.
        let mask = EventMask {
            get: RequestMode::NotifyLog,
            get_many: RequestMode::NotifyLog,
            ..EventMask::DEFAULT
        };
        let (event_sender, event_rx) = EventSender::channel(64, mask);
        let blobs = BlobsProtocol::new(store.store(), Some(event_sender));
        let router = Router::builder(endpoint.clone())
            .accept(iroh_blobs::ALPN, blobs)
            .spawn();

        let inner = Arc::new(Inner {
            endpoint,
            store,
            emit,
            dest_root: config.dest_root,
            broker_url: config.broker_url,
            _router: router,
            slots: Mutex::new(Slots::default()),
            seq: AtomicU64::new(0),
        });

        tokio::spawn(provider_pump(event_rx, Arc::downgrade(&inner)));

        Ok(Self { inner })
    }

    /// This endpoint's ticket-able address. Used by the rendezvous layer
    /// (slices 3-4) to build signed/PAKE'd tickets.
    #[allow(dead_code)]
    pub fn endpoint_addr(&self) -> iroh::EndpointAddr {
        self.inner.endpoint.addr()
    }

    /// Import `paths` as a collection, claim the send slot, and start serving.
    /// Returns the transfer id, the iroh ticket string, and total content
    /// bytes, but emits nothing — the caller decides what the UI sees (the
    /// ticket for a raw share, a code phrase for quick share, or a signed offer
    /// for a trusted device).
    pub async fn start_send(&self, paths: Vec<PathBuf>) -> Result<(String, String, u64), StartError> {
        if paths.is_empty() {
            return Err(StartError::NoFiles);
        }
        self.await_free_slot(Kind::Send).await?;

        // Import files and build the collection before claiming the slot, so a
        // failure here doesn't leave a half-registered send.
        let Imported { root, total, names, pins } =
            build_collection(self.inner.store.store(), &paths)
                .await
                .map_err(|_| StartError::NoFiles)?;

        // The ticket must carry a reachable address. Right after bind the addr
        // holds only the EndpointId until direct addresses (or a relay URL) are
        // discovered, so wait for one before handing out the ticket. Done before
        // taking the lock — never await while holding it.
        let addr = wait_for_addr(&self.inner.endpoint).await;
        let ticket = BlobTicket::new(addr, root, BlobFormat::HashSeq);

        let mut slots = self.inner.slots.lock().unwrap();
        if slots.send.is_some() {
            return Err(StartError::Busy);
        }
        let id = self.inner.next_id(Kind::Send);
        slots.send = Some(SendSlot {
            id: id.clone(),
            total,
            names: names.into(),
            cancel: CancellationToken::new(),
            done: CancellationToken::new(),
            cancelled: false,
            _pins: pins,
        });
        drop(slots);

        tracing::info!(id = %id, files = paths.len(), total, "send: serving");
        Ok((id, ticket.to_string(), total))
    }

    /// Raw share: serve `paths` and hand the iroh ticket straight to the UI as
    /// the code (copy/paste rendezvous, no broker).
    pub async fn send(&self, paths: Vec<PathBuf>) -> Result<String, StartError> {
        let (id, ticket, _total) = self.start_send(paths).await?;
        self.inner.emit(Event::Code { id: id.clone(), kind: Kind::Send, code: ticket });
        Ok(id)
    }

    /// Fetch the content named by `ticket` and export it under the dest root.
    /// The folder is named after a fresh code phrase — a pasted ticket carries
    /// nothing a person would recognise.
    pub async fn receive(&self, ticket: String) -> Result<String, StartError> {
        self.receive_labelled(ticket, None, &codegen::generate()).await
    }

    /// Receive from a named peer: the files land under `<dest>/<peer>/<tag>`.
    /// Used by the trusted-device path, where the sender has a name worth
    /// filing the transfer under.
    pub async fn receive_from(&self, ticket: String, peer: &str) -> Result<String, StartError> {
        self.receive_labelled(ticket, Some(peer), &codegen::generate()).await
    }

    async fn receive_labelled(
        &self,
        ticket: String,
        peer: Option<&str>,
        tag: &str,
    ) -> Result<String, StartError> {
        let ticket: BlobTicket = ticket.trim().parse().map_err(|_| StartError::BadCode)?;
        self.await_free_slot(Kind::Receive).await?;
        let (id, cancel, done) = self.claim_receive()?;
        let dest = receive_dest(&self.inner.dest_root, peer, tag);
        self.spawn_receive(ticket, dest, id.clone(), cancel, done);
        Ok(id)
    }

    /// Claim the single receive slot, or report Busy. Callers `await_free_slot`
    /// first to wait out an unwinding predecessor. Returns the new transfer's id
    /// and its cancel/done tokens.
    fn claim_receive(&self) -> Result<(String, CancellationToken, CancellationToken), StartError> {
        let mut slots = self.inner.slots.lock().unwrap();
        if slots.recv.is_some() {
            return Err(StartError::Busy);
        }
        let id = self.inner.next_id(Kind::Receive);
        let cancel = CancellationToken::new();
        let done = CancellationToken::new();
        slots.recv = Some(RecvSlot {
            id: id.clone(),
            cancel: cancel.clone(),
            done: done.clone(),
            cancelled: false,
        });
        Ok((id, cancel, done))
    }

    /// Spawn the fetch+export task for an already-obtained ticket.
    fn spawn_receive(
        &self,
        ticket: BlobTicket,
        dest: PathBuf,
        id: String,
        cancel: CancellationToken,
        done: CancellationToken,
    ) {
        tracing::info!(id = %id, dest = %dest.display(), "receive: starting");
        let inner = self.inner.clone();
        tokio::spawn(async move {
            run_receive(inner, ticket, dest, id, cancel, done).await;
        });
    }

    /// Quick share: serve `paths`, generate a human code phrase, and run the
    /// PAKE'd ticket exchange over the broker mailbox. Emits the code phrase
    /// (never the raw ticket) for the user to share out of band. No device
    /// trust is added.
    pub async fn quick_share(&self, paths: Vec<PathBuf>) -> Result<String, StartError> {
        let (id, ticket, _total) = self.start_send(paths).await?;
        let phrase = codegen::generate();
        self.inner.emit(Event::Code { id: id.clone(), kind: Kind::Send, code: phrase.clone() });

        let inner = self.inner.clone();
        let run_id = id.clone();
        tokio::spawn(async move {
            if let Err(err) = rendezvous_send(&inner, &phrase, &ticket).await {
                tracing::error!(id = %run_id, error = %err, "quick share: rendezvous failed");
                let mut slots = inner.slots.lock().unwrap();
                if slots.send.as_ref().is_some_and(|s| s.id == run_id) {
                    let done = slots.send.take().unwrap().done;
                    drop(slots);
                    inner.emit(Event::Failed { id: run_id, kind: Kind::Send, error: err });
                    done.cancel();
                }
            }
            // On success the send slot stays live and serves; the provider pump
            // drives progress/done once the receiver fetches.
        });
        Ok(id)
    }

    /// Quick receive: run the PAKE over the code phrase to obtain the sender's
    /// ticket, then fetch and export exactly like a normal receive. No trust
    /// store writes.
    pub async fn quick_receive(&self, code: &str) -> Result<String, StartError> {
        let normalized = codegen::normalize(code);
        let room = codegen::room(&normalized).ok_or(StartError::BadCode)?;
        if !codegen::looks_like_code(&normalized) {
            return Err(StartError::BadCode);
        }
        self.await_free_slot(Kind::Receive).await?;
        let (id, cancel, done) = self.claim_receive()?;

        let inner = self.inner.clone();
        let run_id = id.clone();
        tokio::spawn(async move {
            // Rendezvous (respecting cancel) to obtain the ticket, then hand off
            // to the shared fetch/export path.
            let outcome = tokio::select! {
                biased;
                _ = cancel.cancelled() => None,
                r = rendezvous_receive(&inner, &normalized, &room) => Some(r),
            };
            match outcome {
                None => {
                    // Cancelled during rendezvous: free the slot, emit nothing.
                    inner.slots.lock().unwrap().recv = None;
                    done.cancel();
                }
                Some(Ok(ticket)) => {
                    // The code phrase is this transfer's name: single-use, and
                    // the one thing both sides recognise.
                    let dest = receive_dest(&inner.dest_root, None, &normalized);
                    run_receive(inner.clone(), ticket, dest, run_id, cancel, done).await;
                }
                Some(Err(err)) => {
                    inner.slots.lock().unwrap().recv = None;
                    inner.emit(Event::Failed { id: run_id, kind: Kind::Receive, error: err });
                    done.cancel();
                }
            }
        });
        Ok(id)
    }

    /// Cancel the running transfer of `kind`, if any. Returns promptly; emits no
    /// terminal event. Idempotent.
    pub fn cancel(&self, kind: Kind) {
        let mut slots = self.inner.slots.lock().unwrap();
        match kind {
            Kind::Send => {
                if let Some(slot) = slots.send.as_mut() {
                    if !slot.cancelled {
                        tracing::info!(id = %slot.id, "send: cancel requested");
                        slot.cancelled = true;
                        slot.cancel.cancel();
                        // Send is passive; free the slot now (an in-flight
                        // receiver may still finish on its end — harmless).
                        slot.done.cancel();
                        slots.send = None;
                    }
                }
            }
            Kind::Receive => {
                if let Some(slot) = slots.recv.as_mut() {
                    if !slot.cancelled {
                        tracing::info!(id = %slot.id, "receive: cancel requested");
                        slot.cancelled = true;
                        slot.cancel.cancel();
                    }
                }
            }
        }
    }

    /// Wait out a same-kind transfer that was cancelled but has not finished
    /// unwinding, so the next one can take its place. A live, non-cancelled
    /// transfer is not waited for — that becomes `Busy` at the claim check.
    async fn await_free_slot(&self, kind: Kind) -> Result<(), StartError> {
        let done = {
            let slots = self.inner.slots.lock().unwrap();
            let slot_done = match kind {
                Kind::Send => slots.send.as_ref().filter(|s| s.cancelled).map(|s| s.done.clone()),
                Kind::Receive => slots.recv.as_ref().filter(|s| s.cancelled).map(|s| s.done.clone()),
            };
            slot_done
        };
        let Some(done) = done else { return Ok(()) };
        tracing::info!(kind = kind.as_str(), "waiting for cancelled transfer to unwind");
        match tokio::time::timeout(CANCEL_GRACE, done.cancelled()).await {
            Ok(()) => Ok(()),
            Err(_) => Err(StartError::Unwinding),
        }
    }
}

/// Wait until the endpoint has a reachable address (direct addrs or a relay
/// URL) to embed in a ticket, rather than the bare EndpointId. Bounded so a
/// stuck network never hangs a send indefinitely.
async fn wait_for_addr(endpoint: &Endpoint) -> iroh::EndpointAddr {
    for _ in 0..100 {
        let addr = endpoint.addr();
        if !addr.is_empty() {
            return addr;
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    endpoint.addr()
}

/// Build an endpoint per the relay config, optionally binding IPv4 to a
/// specific address (tests use loopback).
async fn build_endpoint(relay: &RelayConfig, bind_addr: Option<&str>) -> anyhow::Result<Endpoint> {
    let mut builder = match relay {
        RelayConfig::Default => Endpoint::builder(presets::N0),
        RelayConfig::DisableRelay => Endpoint::builder(presets::N0DisableRelay),
        RelayConfig::Custom(url) => {
            let relay_url: iroh::RelayUrl = url.parse()?;
            let map = iroh::RelayMap::from_iter([relay_url]);
            Endpoint::builder(presets::N0).relay_mode(RelayMode::Custom(map))
        }
    };
    if let Some(addr) = bind_addr {
        builder = builder.bind_addr(addr)?;
    }
    Ok(builder.bind().await?)
}

/// An imported send: what is being served, and the pins keeping it alive.
struct Imported {
    root: Hash,
    /// Total content bytes — the files only, no collection overhead.
    total: u64,
    /// File names in manifest order, so progress can say what is moving.
    names: Vec<String>,
    /// Pins all imported content against GC — the caller holds these for the
    /// send's lifetime so the store keeps serving until the transfer finishes
    /// or is cancelled.
    pins: Vec<TempTag>,
}

/// Import each file and wrap them in a collection. Directories are not
/// expanded — the picker and the queue only ever yield files.
async fn build_collection(store: &Store, paths: &[PathBuf]) -> anyhow::Result<Imported> {
    let mut entries: Vec<(String, Hash)> = Vec::with_capacity(paths.len());
    let mut pins: Vec<TempTag> = Vec::with_capacity(paths.len() + 1);
    let mut names: Vec<String> = Vec::with_capacity(paths.len());
    let mut total: u64 = 0;
    for path in paths {
        let meta = std::fs::metadata(path)?;
        if !meta.is_file() {
            anyhow::bail!("not a file: {}", path.display());
        }
        total += meta.len();
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "file".into());
        let tag = store.blobs().add_path(path).temp_tag().await?;
        entries.push((name.clone(), tag.hash()));
        names.push(name);
        pins.push(tag);
    }
    let collection = Collection::from_iter(entries);
    let tag = collection.store(store).await?;
    let root = tag.hash();
    pins.push(tag);
    Ok(Imported { root, total, names, pins })
}

/// The full receive: connect, size, fetch (streamed progress), export. Emits
/// the final 100% progress and the Done event on success, a Failed event on
/// error, and nothing at all on cancel.
async fn run_receive(
    inner: Arc<Inner>,
    ticket: BlobTicket,
    dest: PathBuf,
    id: String,
    cancel: CancellationToken,
    done: CancellationToken,
) {
    let result = tokio::select! {
        biased;
        _ = cancel.cancelled() => {
            tracing::info!(id = %id, "receive: cancelled");
            None
        }
        res = do_receive(&inner, &ticket, &dest, &id) => Some(res),
    };

    match result {
        None => {} // cancelled: emit nothing, leave partial data for resume
        Some(Ok(())) => {
            tracing::info!(id = %id, "receive: complete");
            inner.emit(Event::Done { id: id.clone(), kind: Kind::Receive, dest: dest.to_string_lossy().into_owned() });
        }
        Some(Err(err)) => {
            tracing::error!(id = %id, error = %err, "receive: failed");
            inner.emit(Event::Failed { id: id.clone(), kind: Kind::Receive, error: err });
        }
    }

    // Free the slot after the terminal event is out, then signal done so a
    // waiting retry can proceed.
    let mut slots = inner.slots.lock().unwrap();
    slots.recv = None;
    drop(slots);
    done.cancel();
}

async fn do_receive(
    inner: &Inner,
    ticket: &BlobTicket,
    dest: &Path,
    id: &str,
) -> Result<(), TransferError> {
    let store = inner.store.store();
    let root = ticket.hash();

    // Connect. This is where "peer offline / unreachable / timeout" surfaces.
    let connect = || async {
        inner
            .endpoint
            .connect(ticket.addr().clone(), iroh_blobs::ALPN)
            .await
            .map_err(classify_connect_err)
    };

    // Learn the manifest up front (names, per-file sizes, a real total). The
    // hash-seq root and the collection metadata blob are a few hundred bytes;
    // fetching them into the store first means the bulk fetch below moves file
    // bytes only, so its byte counter and `total` measure the same thing. A
    // dedicated connection: iroh-blobs finishes a connection once its requests
    // complete, so the bulk fetch gets its own.
    let probe = connect().await?;
    fetch_blob(store, &probe, root).await?;
    let seq_bytes = store
        .blobs()
        .get_bytes(root)
        .await
        .map_err(|e| TransferError::new(TransferErrorCode::Storage, e.to_string()))?;
    let hash_seq = HashSeq::try_from(seq_bytes)
        .map_err(|e| TransferError::new(TransferErrorCode::Other, e.to_string()))?;
    // Child 0 of a collection's hash seq is the metadata blob (the names); the
    // rest are the files themselves.
    let meta_hash = hash_seq
        .iter()
        .next()
        .ok_or_else(|| TransferError::new(TransferErrorCode::Other, "empty collection"))?;
    fetch_blob(store, &probe, meta_hash).await?;
    let collection = Collection::load(root, store)
        .await
        .map_err(|e| TransferError::new(TransferErrorCode::Other, e.to_string()))?;

    let mut files: Vec<(String, u64)> = Vec::with_capacity(collection.len());
    let mut total: u64 = 0;
    for (name, hash) in collection.iter() {
        let (size, _) = get_verified_size(&probe, hash).await.map_err(classify_get_err)?;
        total += size;
        files.push((name.clone(), size));
    }
    let file_count = files.len() as u64;
    drop(probe);

    // Bulk-fetch the whole collection on a fresh connection, emitting progress
    // from iroh's byte stream. The tracker withholds samples that came too fast
    // to measure, so this emits on a steady cadence rather than per chunk.
    let conn = connect().await?;
    let mut tracker = RateTracker::new();
    let mut stream = store.remote().fetch(conn.clone(), HashAndFormat::hash_seq(root)).stream();
    while let Some(item) = stream.next().await {
        use iroh_blobs::api::remote::GetProgressItem::*;
        match item {
            Progress(done_bytes) => {
                let (index, name) = progress::file_at(&files, done_bytes);
                if let Some(stats) =
                    tracker.sample(Instant::now(), done_bytes, total, name, index, file_count)
                {
                    inner.emit(Event::Progress { id: id.to_string(), kind: Kind::Receive, stats });
                }
            }
            Done(_) => break,
            Error(e) => return Err(classify_get_err(e)),
        }
    }

    // Export each file to the destination folder under its name.
    std::fs::create_dir_all(dest)
        .map_err(|e| TransferError::new(TransferErrorCode::Storage, e.to_string()))?;
    for (name, hash) in collection.iter() {
        let target = dest.join(sanitize_name(name));
        store
            .blobs()
            .export(*hash, &target)
            .await
            .map_err(|e| TransferError::new(TransferErrorCode::Storage, e.to_string()))?;
    }

    // Guarantee a final 100% before the Done event (emitted by the caller).
    let final_stats = progress::completed(total, file_count);
    inner.emit(Event::Progress { id: id.to_string(), kind: Kind::Receive, stats: final_stats });
    Ok(())
}

/// Fetch one blob into the store by hash. Used for the two tiny structural
/// blobs of a collection (the hash-seq root and the metadata blob) before the
/// bulk transfer starts.
async fn fetch_blob(store: &Store, conn: &Connection, hash: Hash) -> Result<(), TransferError> {
    store
        .remote()
        .fetch(conn.clone(), HashAndFormat::raw(hash))
        .await
        .map_err(classify_get_err)?;
    Ok(())
}

/// Consume the provider event stream and drive send progress/done. One task for
/// the process; it upgrades the `Weak<Inner>` per message and stops when the
/// Manager is dropped.
async fn provider_pump(mut rx: mpsc::Receiver<ProviderMessage>, inner: Weak<Inner>) {
    while let Some(msg) = rx.recv().await {
        // Both get variants carry the same per-request update stream (`rx`).
        // Inlined so the irpc receiver type never has to be named.
        let update_rx = match msg {
            ProviderMessage::GetRequestReceivedNotify(m) => m.rx,
            ProviderMessage::GetManyRequestReceivedNotify(m) => m.rx,
            _ => continue,
        };
        let inner = inner.clone();
        // Follow this request's update stream, accumulating bytes across blobs.
        // A request that transfers no payload (a size probe) never reaches the
        // send total, so it cannot false-signal completion. The recv loop must
        // stay tight — anything slow here (a blocking log, a contended lock)
        // lets the provider's bounded update channel fill and abort the serve.
        let Some(inner_arc) = inner.upgrade() else { return };
        // Snapshot the active send once — a stale request with no active send is
        // ignored. Keeps the per-update loop lock-free so it drains fast enough
        // that the provider's bounded update channel never fills.
        let (id, total, cancel_tok, names) = {
            let slots = inner_arc.slots.lock().unwrap();
            match &slots.send {
                Some(s) => (s.id.clone(), s.total, s.cancel.clone(), s.names.clone()),
                None => continue,
            }
        };
        tokio::spawn(async move {
            let file_count = names.len() as u64;
            let mut tracker = RateTracker::new();
            // Bytes of *file* blobs served so far, and the offset within the
            // blob currently being served. `Started.index` is the position in
            // the collection's hash seq: 0 is the seq root and 1 the metadata
            // blob — a few hundred bytes of structure that are not content.
            // Counting them made `sent` overshoot `total`, ending the send
            // before the last of the payload had actually gone out.
            //
            // The same index tells the real download from a receiver's probes:
            // a probe (a verified-size request, or the manifest fetch) requests
            // a single blob, which is index 0 of its own request, so it can
            // never look like file content.
            let mut content: u64 = 0;
            let mut offset: u64 = 0;
            // 1-based index of the file being served, or None for a structural
            // blob. `Some` at any point means this request is the real download.
            let mut current: Option<u64> = None;
            let mut served_content = false;
            let mut updates = update_rx;

            while let Ok(Some(update)) = updates.recv().await {
                if cancel_tok.is_cancelled() {
                    return;
                }
                match update {
                    RequestUpdate::Started(t) => {
                        if current.is_some() {
                            content += offset;
                        }
                        offset = 0;
                        current = t.index.checked_sub(2).map(|i| i + 1);
                        served_content |= current.is_some();
                    }
                    RequestUpdate::Progress(p) => {
                        offset = p.end_offset;
                        // Only surface progress for file content, not probes.
                        if let Some(index) = current {
                            let name =
                                names.get(index as usize - 1).cloned().unwrap_or_default();
                            if let Some(stats) = tracker.sample(
                                Instant::now(),
                                content + offset,
                                total,
                                name,
                                index,
                                file_count,
                            ) {
                                inner_arc.emit(Event::Progress {
                                    id: id.clone(),
                                    kind: Kind::Send,
                                    stats,
                                });
                            }
                        }
                    }
                    RequestUpdate::Completed(_) => {
                        // Completed fires per blob, not per request. Returning
                        // early would drop the update channel and make the
                        // provider abort the rest of the transfer, so only the
                        // last file blob ends the send.
                        if current.is_some() {
                            content += offset;
                        }
                        offset = 0;
                        current = None;
                        if served_content && total > 0 && content >= total {
                            finish_send(&inner_arc, &id, total, file_count);
                            return;
                        }
                    }
                    RequestUpdate::Aborted(_) => {
                        // Only the real download aborting is a send failure; a
                        // probe being reset is not.
                        if served_content {
                            let mut slots = inner_arc.slots.lock().unwrap();
                            if slots.send.as_ref().is_some_and(|s| s.id == id) {
                                let done = slots.send.take().unwrap().done;
                                drop(slots);
                                inner_arc.emit(Event::Failed {
                                    id: id.clone(),
                                    kind: Kind::Send,
                                    error: TransferError::of(TransferErrorCode::Disconnected),
                                });
                                done.cancel();
                            }
                        }
                        return;
                    }
                }
            }
        });
    }
}

/// Emit the final 100% progress + Done for a send and free the slot.
fn finish_send(inner: &Inner, id: &str, total: u64, file_count: u64) {
    let mut slots = inner.slots.lock().unwrap();
    let done = match &slots.send {
        Some(s) if s.id == id => s.done.clone(),
        _ => return, // already finished/cancelled
    };
    slots.send = None;
    drop(slots);

    let final_stats = progress::completed(total, file_count);
    inner.emit(Event::Progress { id: id.to_string(), kind: Kind::Send, stats: final_stats });
    inner.emit(Event::Done { id: id.to_string(), kind: Kind::Send, dest: String::new() });
    tracing::info!(id = %id, "send: complete");
    done.cancel();
}

/// The folder one receive exports into: `<root>/<peer>/<tag>`, or `<root>/<tag>`
/// when the sender has no name here. Every transfer gets its own folder, so two
/// receives never mix their files, and `tag` is a code phrase rather than a
/// hash so the folder is something a person can read.
fn receive_dest(root: &Path, peer: Option<&str>, tag: &str) -> PathBuf {
    let base = match peer.map(path_component).filter(|p| !p.is_empty()) {
        Some(peer) => root.join(peer),
        None => root.to_path_buf(),
    };
    let name = path_component(tag);
    let name = if name.is_empty() { "transfer".to_string() } else { name };

    // The same code can be received twice (a resumed or repeated share); the
    // second copy gets its own folder instead of landing on the first.
    let first = base.join(&name);
    if !first.exists() {
        return first;
    }
    (2..1000)
        .map(|n| base.join(format!("{name}-{n}")))
        .find(|p| !p.exists())
        .unwrap_or(first)
}

/// One safe path component: no separators, no traversal, no characters Windows
/// refuses. Empty when nothing usable is left.
fn path_component(name: &str) -> String {
    let cleaned: String = name
        .trim()
        .chars()
        .map(|c| if std::path::is_separator(c) || "\\:*?\"<>|".contains(c) { '-' } else { c })
        .collect();
    Path::new(cleaned.trim())
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .filter(|n| !n.is_empty() && n != "." && n != "..")
        .unwrap_or_default()
}

/// Keep only the file name component, never a path — a malicious collection
/// entry must not write outside the destination folder.
fn sanitize_name(name: &str) -> String {
    let name = path_component(name);
    if name.is_empty() {
        "file".to_string()
    } else {
        name
    }
}

// ---- quick-share rendezvous (SPAKE2 over the broker mailbox) ----

/// Sender side: join the mailbox, run SPAKE2, and hand the receiver the iroh
/// ticket sealed under the derived key.
async fn rendezvous_send(inner: &Inner, code: &str, ticket: &str) -> Result<(), TransferError> {
    let room = codegen::room(code).ok_or_else(|| TransferError::of(TransferErrorCode::Other))?;
    let mut mailbox = client::join(&inner.broker_url, &room).await.map_err(broker_err)?;
    let (handshake, my_msg) = pake::start(code, &room);
    mailbox.send(&my_msg).await.map_err(broker_err)?;
    let peer_msg = mailbox.recv().await.map_err(broker_err)?;
    let key = handshake.finish(&peer_msg).map_err(|_| wrong_code_err())?;
    let sealed = pake::seal(&key, ticket.as_bytes())
        .map_err(|_| TransferError::of(TransferErrorCode::Other))?;
    mailbox.send(&sealed).await.map_err(broker_err)?;
    Ok(())
}

/// Receiver side: join the mailbox, run SPAKE2, and decrypt the sender's ticket.
/// A wrong code fails the PAKE/AEAD, so no ticket is ever revealed.
async fn rendezvous_receive(inner: &Inner, code: &str, room: &str) -> Result<BlobTicket, TransferError> {
    let mut mailbox = client::join(&inner.broker_url, room).await.map_err(broker_err)?;
    let (handshake, my_msg) = pake::start(code, room);
    mailbox.send(&my_msg).await.map_err(broker_err)?;
    let peer_msg = mailbox.recv().await.map_err(broker_err)?;
    let key = handshake.finish(&peer_msg).map_err(|_| wrong_code_err())?;
    let sealed = mailbox.recv().await.map_err(broker_err)?;
    let plaintext = pake::open(&key, &sealed).map_err(|_| wrong_code_err())?;
    let ticket = String::from_utf8(plaintext).map_err(|_| wrong_code_err())?;
    ticket
        .trim()
        .parse::<BlobTicket>()
        .map_err(|_| TransferError::new(TransferErrorCode::BadTicket, "The sender's ticket was invalid."))
}

/// Map a broker-client string error to a classified transfer error.
fn broker_err(msg: String) -> TransferError {
    if msg.contains("in use") {
        TransferError::new(TransferErrorCode::Other, "That code is already in use. Try another.")
    } else {
        TransferError::new(
            TransferErrorCode::Connect,
            "Could not reach the rendezvous server. Check your connection and try again.",
        )
    }
}

/// The single message for every "code did not match" failure — the PAKE
/// rejecting, the AEAD failing to open, or a garbled ticket. Deliberately does
/// not distinguish, so a wrong code reveals nothing.
fn wrong_code_err() -> TransferError {
    TransferError::new(TransferErrorCode::Other, "That code does not match the sender. Check it and try again.")
}

fn classify_connect_err(err: iroh::endpoint::ConnectError) -> TransferError {
    let text = err.to_string();
    let code = if text.contains("timeout") || text.contains("timed out") {
        TransferErrorCode::Timeout
    } else {
        TransferErrorCode::Connect
    };
    TransferError::new(code, code.default_message())
}

fn classify_get_err(err: iroh_blobs::get::GetError) -> TransferError {
    let text = err.to_string();
    let code = if text.contains("timeout") || text.contains("timed out") {
        TransferErrorCode::Timeout
    } else if text.contains("connection") || text.contains("closed") || text.contains("reset") {
        TransferErrorCode::Disconnected
    } else {
        TransferErrorCode::Other
    };
    TransferError::new(code, code.default_message())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::transport::event::Stats;
    use std::io::Write;

    /// Collects emitted events for assertions.
    #[derive(Clone, Default)]
    struct Collector(Arc<Mutex<Vec<Event>>>);
    impl Emitter for Collector {
        fn emit(&self, event: Event) {
            self.0.lock().unwrap().push(event);
        }
    }
    impl Collector {
        fn events(&self) -> Vec<Event> {
            self.0.lock().unwrap().clone()
        }
    }

    async fn manager(dir: &Path, name: &str, emit: Arc<dyn Emitter>) -> Manager {
        Manager::new(
            Config {
                store_path: Some(dir.join(name)),
                dest_root: dir.join(format!("{name}-dl")),
                relay: RelayConfig::DisableRelay,
                bind_addr: Some("127.0.0.1:0".into()),
                broker_url: "ws://127.0.0.1:1/ws".into(), // unused by these tests
            },
            emit,
        )
        .await
        .unwrap()
    }

    fn write_file(dir: &Path, name: &str, bytes: &[u8]) -> PathBuf {
        let p = dir.join(name);
        let mut f = std::fs::File::create(&p).unwrap();
        f.write_all(bytes).unwrap();
        p
    }

    fn ticket_of(events: &[Event]) -> String {
        events
            .iter()
            .find_map(|e| match e {
                Event::Code { code, .. } => Some(code.clone()),
                _ => None,
            })
            .expect("no code event")
    }

    async fn wait_for<F: Fn(&[Event]) -> bool>(c: &Collector, pred: F) {
        for _ in 0..200 {
            if pred(&c.events()) {
                return;
            }
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
        panic!("condition not met; events: {:?}", c.events());
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn send_receive_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let payload = vec![7u8; 300_000];
        let src = write_file(tmp.path(), "hello.bin", &payload);

        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        let ticket = ticket_of(&se.events());

        receiver.receive(ticket).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        // Received bytes match, in a per-hash subfolder under the dest root.
        let dest = tmp.path().join("r-dl");
        let mut found = None;
        for entry in walk(&dest) {
            if entry.file_name().unwrap() == "hello.bin" {
                found = Some(std::fs::read(&entry).unwrap());
            }
        }
        assert_eq!(found.as_deref(), Some(&payload[..]));
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn final_progress_precedes_done() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "f.bin", &vec![3u8; 200_000]);
        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive(ticket_of(&se.events())).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        let events = re.events();
        let done_at = events.iter().position(|e| matches!(e, Event::Done { .. })).unwrap();
        // The event immediately before Done is a 100% progress.
        let last_progress = events[..done_at]
            .iter()
            .rev()
            .find_map(|e| match e {
                Event::Progress { stats, .. } => Some(stats.percent),
                _ => None,
            })
            .unwrap();
        assert_eq!(last_progress, 100.0);
        // Done is the terminal event.
        assert!(!events[done_at + 1..].iter().any(|e| matches!(e, Event::Done { .. } | Event::Failed { .. })));
    }

    /// Every progress snapshot of `kind`, in order.
    fn progress_of(c: &Collector, want: Kind) -> Vec<Stats> {
        c.events()
            .iter()
            .filter_map(|e| match e {
                Event::Progress { kind, stats, .. } if *kind == want => Some(stats.clone()),
                _ => None,
            })
            .collect()
    }

    /// Both sides must name the file they are moving and count the files
    /// correctly — the send side reported `0 files` and the receive side one
    /// too many (it counted the collection metadata blob as a file).
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn progress_names_the_files_being_moved() {
        let tmp = tempfile::tempdir().unwrap();
        let a = write_file(tmp.path(), "a.bin", &vec![1u8; 3_000_000]);
        let b = write_file(tmp.path(), "b.bin", &vec![2u8; 3_000_000]);

        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![a, b]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive(ticket_of(&se.events())).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        for (side, stats) in [("send", progress_of(&se, Kind::Send)), ("recv", progress_of(&re, Kind::Receive))] {
            assert!(!stats.is_empty(), "{side}: no progress events");
            for s in &stats {
                assert_eq!(s.file_count, 2, "{side}: wrong file count in {s:?}");
                assert_eq!(s.total, 6_000_000, "{side}: total must be content bytes only");
            }
            // The manifest is known while bytes are moving, not just at the end
            // — every in-flight snapshot names the file it is counting. (Which
            // files get a snapshot depends on timing: updates are paced, and a
            // local transfer this size can finish inside one window.)
            let names = ["a.bin", "b.bin"];
            let in_flight: Vec<&Stats> = stats.iter().filter(|s| !s.file.is_empty()).collect();
            assert!(!in_flight.is_empty(), "{side}: no progress event named a file");
            for s in in_flight {
                let index = s.file_index as usize;
                assert!((1..=2).contains(&index), "{side}: file index out of range in {s:?}");
                assert_eq!(s.file, names[index - 1], "{side}: name and index disagree in {s:?}");
            }
            // The terminal snapshot keeps the count: the completion
            // notification reads it, and a defaulted one said "0 files".
            let last = stats.last().unwrap();
            assert_eq!(last.percent, 100.0, "{side}: last progress is not 100%");
            assert_eq!(last.file_count, 2, "{side}: terminal snapshot lost the file count");
            assert_eq!(last.sent, last.total, "{side}: terminal snapshot is short");
        }
    }

    /// iroh pushes progress thousands of times a second; folding every push
    /// produced ~5500 events for one transfer and rates in the tens of GB/s
    /// (which pinned the ETA at 0s). Updates must be paced and the rate sane.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn progress_is_paced_and_the_rate_is_believable() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "big.bin", &vec![4u8; 32_000_000]);

        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive(ticket_of(&se.events())).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        // A loopback QUIC transfer does not exceed a few hundred MB/s; anything
        // near this bound means the rate was measured over a ~0 time gap.
        const IMPOSSIBLE_BPS: f64 = 5e9;
        for (side, stats) in [("send", progress_of(&se, Kind::Send)), ("recv", progress_of(&re, Kind::Receive))] {
            assert!(
                stats.len() <= 40,
                "{side}: {} progress events for one transfer — updates are not paced",
                stats.len()
            );
            for s in &stats {
                assert!(s.bps < IMPOSSIBLE_BPS, "{side}: implausible rate in {s:?}");
                assert!(s.eta >= -1, "{side}: bad eta in {s:?}");
            }
        }
    }

    /// The provider tells the real download from a receiver's probes by blob
    /// index, so a single-file collection (where the bulk request may serve one
    /// blob) must still complete the send.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn single_file_send_completes() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "only.bin", &vec![5u8; 1_500_000]);

        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive(ticket_of(&se.events())).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        let last = progress_of(&se, Kind::Send).pop().expect("no send progress");
        assert_eq!(last.file_count, 1);
        assert_eq!(last.sent, 1_500_000);
        assert_eq!(last.percent, 100.0);
    }

    #[test]
    fn receive_dest_is_one_readable_folder_per_transfer() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();

        // No known sender: straight under the root, named by the code phrase.
        assert_eq!(receive_dest(root, None, "4821-crayon-mimic-otter"), root.join("4821-crayon-mimic-otter"));
        // A named device gets its own shelf.
        assert_eq!(
            receive_dest(root, Some("Nico's MacBook"), "7421-velvet-otter-reef"),
            root.join("Nico's MacBook").join("7421-velvet-otter-reef")
        );
        // A peer name is never allowed to escape the root or break the path;
        // separators are flattened rather than dropped, so the name still reads
        // like what the device is called.
        assert_eq!(receive_dest(root, Some("../../etc"), "tag"), root.join("..-..-etc").join("tag"));
        assert_eq!(receive_dest(root, Some("a/b:c"), "tag"), root.join("a-b-c").join("tag"));
        assert_eq!(receive_dest(root, Some("   "), "tag"), root.join("tag"));
        assert_eq!(receive_dest(root, None, "../evil"), root.join("..-evil"));
        assert_eq!(receive_dest(root, None, ""), root.join("transfer"));

        // The same code twice must not land on top of the first copy.
        let first = receive_dest(root, None, "9930-amber-finch-loop");
        std::fs::create_dir_all(&first).unwrap();
        let second = receive_dest(root, None, "9930-amber-finch-loop");
        assert_eq!(second, root.join("9930-amber-finch-loop-2"));
        std::fs::create_dir_all(&second).unwrap();
        assert_eq!(receive_dest(root, None, "9930-amber-finch-loop"), root.join("9930-amber-finch-loop-3"));
    }

    /// A pasted ticket has no code phrase, so the folder is a generated one —
    /// and two receives of the same content still land apart.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn each_receive_gets_its_own_folder() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "shared.bin", &vec![6u8; 300_000]);
        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        // The same file, sent and received twice over.
        for round in 1..=2 {
            sender.send(vec![src.clone()]).await.unwrap();
            wait_for(&se, |e| e.iter().filter(|x| matches!(x, Event::Code { .. })).count() >= round).await;
            let ticket = se
                .events()
                .iter()
                .filter_map(|e| match e {
                    Event::Code { code, .. } => Some(code.clone()),
                    _ => None,
                })
                .next_back()
                .unwrap();
            receiver.receive(ticket).await.unwrap();
            wait_for(&re, |e| e.iter().filter(|x| matches!(x, Event::Done { .. })).count() >= round).await;
            wait_for_manager_idle(&receiver).await;
        }

        let root = tmp.path().join("r-dl");
        let copies: Vec<PathBuf> = walk(&root)
            .into_iter()
            .filter(|p| p.file_name().unwrap() == "shared.bin")
            .collect();
        assert_eq!(copies.len(), 2, "each receive gets its own folder: {copies:?}");
        for copy in &copies {
            let folder = copy.parent().unwrap();
            assert_eq!(folder.parent().unwrap(), root);
            let name = folder.file_name().unwrap().to_string_lossy().into_owned();
            assert!(codegen::looks_like_code(&name), "folder {name} is not a code phrase");
        }
        assert_ne!(copies[0].parent(), copies[1].parent());
    }

    /// A trusted-device receive files itself under the sender's name.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn receive_from_a_named_peer_is_filed_under_that_name() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "from-peer.bin", &vec![7u8; 120_000]);
        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive_from(ticket_of(&se.events()), "Workshop PC").await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        let file = walk(&tmp.path().join("r-dl"))
            .into_iter()
            .find(|p| p.file_name().unwrap() == "from-peer.bin")
            .expect("nothing exported");
        let folder = file.parent().unwrap();
        assert_eq!(folder.parent().unwrap(), tmp.path().join("r-dl").join("Workshop PC"));
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn second_send_is_busy() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "a.bin", b"data-abcdef");
        let se = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;

        sender.send(vec![src.clone()]).await.unwrap();
        let err = sender.send(vec![src]).await.unwrap_err();
        assert_eq!(err, StartError::Busy);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn cancelled_receive_emits_nothing_terminal() {
        let tmp = tempfile::tempdir().unwrap();
        // Large-ish payload so the receive is in flight when we cancel.
        let src = write_file(tmp.path(), "big.bin", &vec![9u8; 8_000_000]);
        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive(ticket_of(&se.events())).await.unwrap();
        // Cancel almost immediately.
        tokio::time::sleep(Duration::from_millis(30)).await;
        receiver.cancel(Kind::Receive);

        tokio::time::sleep(Duration::from_millis(500)).await;
        assert!(
            !re.events().iter().any(|e| matches!(e, Event::Done { .. } | Event::Failed { .. })),
            "cancelled receive must emit no terminal event; got {:?}",
            re.events()
        );
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn bad_ticket_rejected() {
        let tmp = tempfile::tempdir().unwrap();
        let receiver = manager(tmp.path(), "r", Arc::new(Collector::default())).await;
        assert_eq!(receiver.receive("not-a-ticket".into()).await.unwrap_err(), StartError::BadCode);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn empty_send_rejected() {
        let tmp = tempfile::tempdir().unwrap();
        let sender = manager(tmp.path(), "s", Arc::new(Collector::default())).await;
        assert_eq!(sender.send(vec![]).await.unwrap_err(), StartError::NoFiles);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn second_receive_is_busy() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "a.bin", &vec![1u8; 4_000_000]);
        let se = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(Collector::default())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        let ticket = ticket_of(&se.events());
        receiver.receive(ticket.clone()).await.unwrap();
        // A second receive while the first is in flight is rejected.
        assert_eq!(receiver.receive(ticket).await.unwrap_err(), StartError::Busy);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn cancelled_send_emits_nothing_terminal() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "s.bin", &vec![5u8; 200_000]);
        let se = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        sender.cancel(Kind::Send);
        // A fresh send is allowed immediately after cancel (slot freed).
        let src2 = write_file(tmp.path(), "s2.bin", b"second-file");
        sender.send(vec![src2]).await.unwrap();
        assert!(
            !se.events().iter().any(|e| matches!(e, Event::Done { .. } | Event::Failed { .. })),
            "cancelled send must emit no terminal event; got {:?}",
            se.events()
        );
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn multi_file_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let a = write_file(tmp.path(), "one.txt", &vec![b'a'; 50_000]);
        let b = write_file(tmp.path(), "two.txt", &vec![b'b'; 70_000]);
        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![a, b]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive(ticket_of(&se.events())).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        let files: std::collections::HashMap<_, _> = walk(&tmp.path().join("r-dl"))
            .into_iter()
            .map(|p| (p.file_name().unwrap().to_string_lossy().into_owned(), std::fs::read(&p).unwrap()))
            .collect();
        assert_eq!(files.get("one.txt").map(|v| v.len()), Some(50_000));
        assert_eq!(files.get("two.txt").map(|v| v.len()), Some(70_000));
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn re_receive_is_idempotent_resume() {
        // Receiving the same ticket twice into the same on-disk store completes
        // both times — the second reuses the content already held (resume path).
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "r.bin", &vec![4u8; 400_000]);
        let se = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(Collector::default())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        let ticket = ticket_of(&se.events());

        // Same receiver + on-disk store, driven twice; both complete. The second
        // finds the content already local and reuses it.
        for _ in 0..2 {
            receiver.receive(ticket.clone()).await.unwrap();
            wait_for_manager_idle(&receiver).await;
        }
        let got = walk(&tmp.path().join("r-dl"))
            .into_iter()
            .find(|p| p.file_name().unwrap() == "r.bin")
            .map(|p| std::fs::read(&p).unwrap());
        assert_eq!(got.map(|v| v.len()), Some(400_000));
    }

    /// Wait until the receiver's slot is free again (terminal reached).
    async fn wait_for_manager_idle(m: &Manager) {
        for _ in 0..400 {
            if m.inner.slots.lock().unwrap().recv.is_none() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
        panic!("receive did not finish");
    }

    fn walk(dir: &Path) -> Vec<PathBuf> {
        let mut out = Vec::new();
        if let Ok(rd) = std::fs::read_dir(dir) {
            for e in rd.flatten() {
                let p = e.path();
                if p.is_dir() {
                    out.extend(walk(&p));
                } else {
                    out.push(p);
                }
            }
        }
        out
    }

    // ---- quick share (code phrase over a mock broker + real iroh) ----

    async fn quick_manager(dir: &Path, name: &str, broker: &str, emit: Arc<dyn Emitter>) -> Manager {
        Manager::new(
            Config {
                store_path: Some(dir.join(name)),
                dest_root: dir.join(format!("{name}-dl")),
                relay: RelayConfig::DisableRelay,
                bind_addr: Some("127.0.0.1:0".into()),
                broker_url: broker.to_string(),
            },
            emit,
        )
        .await
        .unwrap()
    }

    /// A minimal in-process stand-in for the Go broker's mailbox mode: pairs two
    /// parties by room and relays their opaque frames, buffering the first
    /// party's frames until the second joins. Mirrors broker/mailbox.go so the
    /// Rust client + PAKE + orchestration can be exercised without the Go binary
    /// (the broker has its own Go tests).
    async fn spawn_mock_broker() -> String {
        use futures_util::SinkExt;
        use futures_util::StreamExt as _; // Sink::send; next() qualified below (n0_future also in scope)
        use std::collections::HashMap;
        use std::sync::atomic::{AtomicU64, Ordering};
        use tokio::sync::mpsc;
        use tokio::sync::Mutex as AsyncMutex;
        use tokio_tungstenite::tungstenite::Message;

        #[derive(serde::Deserialize)]
        struct Wire {
            #[serde(rename = "type")]
            typ: String,
            room: Option<String>,
        }
        #[derive(Default)]
        struct Room {
            parties: Vec<(u64, mpsc::UnboundedSender<Message>)>,
            buffered: Vec<Message>,
        }
        type Rooms = Arc<AsyncMutex<HashMap<String, Room>>>;

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let rooms: Rooms = Arc::new(AsyncMutex::new(HashMap::new()));
        static IDS: AtomicU64 = AtomicU64::new(0);

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let rooms = rooms.clone();
                tokio::spawn(async move {
                    let ws = match tokio_tungstenite::accept_async(stream).await {
                        Ok(ws) => ws,
                        Err(_) => return,
                    };
                    let (mut write, mut read) = ws.split();
                    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
                    tokio::spawn(async move {
                        while let Some(m) = rx.recv().await {
                            if write.send(m).await.is_err() {
                                break;
                            }
                        }
                    });

                    // First frame is the join.
                    let room_id = match futures_util::StreamExt::next(&mut read).await {
                        Some(Ok(Message::Text(t))) => {
                            match serde_json::from_str::<Wire>(&t) {
                                Ok(w) if w.typ == "join" => w.room.unwrap_or_default(),
                                _ => return,
                            }
                        }
                        _ => return,
                    };
                    let my_id = IDS.fetch_add(1, Ordering::Relaxed);

                    let backlog = {
                        let mut g = rooms.lock().await;
                        let rm = g.entry(room_id.clone()).or_default();
                        let backlog = std::mem::take(&mut rm.buffered);
                        rm.parties.push((my_id, tx.clone()));
                        backlog
                    };
                    for m in backlog {
                        let _ = tx.send(m);
                    }

                    // Relay loop: forward each frame to the peer, or buffer it.
                    while let Some(Ok(msg)) = futures_util::StreamExt::next(&mut read).await {
                        if !matches!(msg, Message::Text(_)) {
                            continue;
                        }
                        let mut g = rooms.lock().await;
                        let rm = g.entry(room_id.clone()).or_default();
                        if let Some((_, peer)) = rm.parties.iter().find(|(id, _)| *id != my_id) {
                            let _ = peer.send(msg);
                        } else {
                            rm.buffered.push(msg);
                        }
                    }

                    let mut g = rooms.lock().await;
                    if let Some(rm) = g.get_mut(&room_id) {
                        rm.parties.retain(|(id, _)| *id != my_id);
                    }
                });
            }
        });
        format!("ws://{addr}/ws")
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn quick_share_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let broker = spawn_mock_broker().await;
        let payload = vec![2u8; 250_000];
        let src = write_file(tmp.path(), "quick.bin", &payload);

        let se = Collector::default();
        let re = Collector::default();
        let sender = quick_manager(tmp.path(), "s", &broker, Arc::new(se.clone())).await;
        let receiver = quick_manager(tmp.path(), "r", &broker, Arc::new(re.clone())).await;

        sender.quick_share(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        let phrase = ticket_of(&se.events()); // the code event carries the phrase

        receiver.quick_receive(&phrase).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        // The code phrase names the folder: `<dest root>/<phrase>/quick.bin`.
        let file = walk(&tmp.path().join("r-dl"))
            .into_iter()
            .find(|p| p.file_name().unwrap() == "quick.bin")
            .expect("quick.bin was not exported");
        assert_eq!(std::fs::read(&file).unwrap(), payload);
        assert_eq!(file.parent().unwrap(), tmp.path().join("r-dl").join(&phrase));
    }

    /// Live cross-language check: quick share over a REAL Go broker (mailbox
    /// mode), not the mock — proves the Rust client wire matches broker/mailbox.go.
    /// Gated: run with a broker at `FLOPPY_TEST_BROKER` (e.g. `ws://127.0.0.1:8799/ws`).
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore = "needs a running Go broker at FLOPPY_TEST_BROKER"]
    async fn live_quick_share_against_real_broker() {
        let Ok(broker) = std::env::var("FLOPPY_TEST_BROKER") else { return };
        let tmp = tempfile::tempdir().unwrap();
        let payload = vec![7u8; 300_000];
        let src = write_file(tmp.path(), "live.bin", &payload);

        let se = Collector::default();
        let re = Collector::default();
        let sender = quick_manager(tmp.path(), "s", &broker, Arc::new(se.clone())).await;
        let receiver = quick_manager(tmp.path(), "r", &broker, Arc::new(re.clone())).await;

        sender.quick_share(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.quick_receive(&ticket_of(&se.events())).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;

        let got = walk(&tmp.path().join("r-dl"))
            .into_iter()
            .find(|p| p.file_name().unwrap() == "live.bin")
            .map(|p| std::fs::read(&p).unwrap());
        assert_eq!(got.as_deref(), Some(&payload[..]));
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn quick_share_wrong_code_fails_without_leaking() {
        let tmp = tempfile::tempdir().unwrap();
        let broker = spawn_mock_broker().await;
        let src = write_file(tmp.path(), "secret.bin", &vec![3u8; 100_000]);

        let se = Collector::default();
        let re = Collector::default();
        let sender = quick_manager(tmp.path(), "s", &broker, Arc::new(se.clone())).await;
        let receiver = quick_manager(tmp.path(), "r", &broker, Arc::new(re.clone())).await;

        sender.quick_share(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        let phrase = ticket_of(&se.events());
        // Same room (leading segment) but wrong words: both land in the mailbox,
        // the PAKE runs, and the key mismatch must fail — no ticket, no fetch.
        let room = phrase.split('-').next().unwrap();
        let wrong = format!("{room}-wrong-wrong-wrong");

        receiver.quick_receive(&wrong).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Failed { .. }))).await;
        assert!(
            !re.events().iter().any(|e| matches!(e, Event::Done { .. })),
            "wrong code must not complete a transfer"
        );
    }
}
