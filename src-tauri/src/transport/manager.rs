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
use crate::transport::dest::{now_stamp, receive_dest, sanitize_name};
use crate::transport::error::{StartError, TransferError, TransferErrorCode};
use crate::transport::event::{Emitter, Event, Kind};
use crate::transport::progress::{self, RateTracker};

/// How long a new transfer waits for a cancelled predecessor of the same kind
/// to finish unwinding before giving up with `Unwinding`.
const CANCEL_GRACE: Duration = Duration::from_secs(20);

/// Fired once a receive has fully received and exported its content — never on
/// cancel or failure. The trusted path uses it to signal completion back to the
/// sender, whose passive send may not otherwise know it finished (a deduped or
/// resumed receive moves fewer bytes than the send holds).
type CompleteCb = Box<dyn FnOnce() + Send>;

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
    /// The user-visible root received files are written under, one
    /// datetime-stamped folder per transfer: `dest_root/<datetime>[ from <device>]/`.
    pub dest_root: PathBuf,
    pub relay: RelayConfig,
    /// Rendezvous broker mailbox URL (`ws://…/ws` or `wss://…/ws`) for quick
    /// share. The transport itself never contacts it; quick_share/quick_receive do.
    pub broker_url: String,
    /// Bind the IPv4 socket to a specific address instead of `0.0.0.0`. The app
    /// leaves this `None`; hermetic tests set `127.0.0.1:0` so the advertised
    /// address is loopback-routable without a relay.
    pub bind_addr: Option<String>,
    /// How long a passive send keeps serving with no completion and no progress
    /// before it expires — freeing its slot and unpinning its content, so a
    /// never-accepted offer or a peer that vanished mid-fetch cannot hold the
    /// single send slot forever. Reset by any progress, so an active transfer is
    /// never cut off. Expiry emits no `Done` (nothing was delivered).
    pub send_ttl: Duration,
}

/// Platform hook that "publishes" a freshly-exported transfer folder to its
/// final, user-visible home, returning the path to report to the UI.
///
/// Desktop/iOS don't set one — the export path *is* the final path. Android
/// does: iroh can only export to an app-private path, but the user-visible
/// destination is the public Downloads collection, reachable only through the
/// media store. The hook copies the app-private folder into public Downloads via
/// `tauri-plugin-android-fs`, reaps the private copy, and returns a display path.
/// Wired in `lib.rs`, where the `AppHandle` (and thus the plugin) is in scope, so
/// the transport core stays platform-agnostic and unit-testable.
pub type Publish = Arc<dyn Fn(&Path) -> std::io::Result<PathBuf> + Send + Sync>;

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
    /// Last time this send made progress (or was claimed, before any). The TTL
    /// reaper reads it: an idle send past `send_ttl` expires; progress keeps it
    /// alive.
    last_active: Instant,
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
    send_ttl: Duration,
    /// Optional per-platform "publish exported folder → user-visible home" hook
    /// (Android public Downloads). `None` on desktop/iOS: the export path is final.
    publish: Option<Publish>,
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

    /// Mark the live send `id` as active now, so the TTL reaper does not expire
    /// a transfer that is still moving bytes.
    fn touch_send(&self, id: &str) {
        let mut slots = self.slots.lock().unwrap();
        if let Some(s) = slots.send.as_mut().filter(|s| s.id == id) {
            s.last_active = Instant::now();
        }
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
    /// Construct with no receive-destination publish hook — the export path is
    /// the final path (desktop/iOS, and every test). The app uses
    /// `new_with_publish` to route Android receives to public Downloads.
    #[allow(dead_code)] // used by tests and the pairing service's test harness
    pub async fn new(config: Config, emit: Arc<dyn Emitter>) -> anyhow::Result<Self> {
        Self::new_with_publish(config, emit, None).await
    }

    /// Like `new`, but with a per-platform `publish` hook for the receive
    /// destination (see [`Publish`]). The app wires this on Android; every other
    /// caller (and every test) uses `new`, which passes `None`.
    pub async fn new_with_publish(
        config: Config,
        emit: Arc<dyn Emitter>,
        publish: Option<Publish>,
    ) -> anyhow::Result<Self> {
        std::fs::create_dir_all(&config.dest_root)?;

        let endpoint = build_endpoint(&config.relay, config.bind_addr.as_deref()).await?;
        // Warm the endpoint (relay pick + holepunch) in the background, so the
        // first send's ticket address is ready at once instead of the send having
        // to block on `wait_for_addr` while discovery runs. This is also what
        // makes a trusted-device offer go out promptly rather than after warm-up.
        let warm = endpoint.clone();
        tokio::spawn(async move { warm.online().await });
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
            send_ttl: config.send_ttl,
            publish,
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
        self.await_free_slot().await?;

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
        // Single active session: a live receive blocks a new send too.
        if slots.send.is_some() || slots.recv.is_some() {
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
            last_active: Instant::now(),
            _pins: pins,
        });
        drop(slots);

        // Reap this send if it sits idle past the TTL (never accepted, or a peer
        // that vanished mid-fetch) so it does not hold the slot and its pins.
        tokio::spawn(expire_send_loop(Arc::downgrade(&self.inner), id.clone(), self.inner.send_ttl));

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

    /// Fetch the content named by `ticket` and export it under the dest root,
    /// in a datetime-stamped folder. A pasted ticket carries no trusted identity,
    /// so the folder has no ` from <device>` segment.
    pub async fn receive(&self, ticket: String) -> Result<String, StartError> {
        self.receive_labelled(ticket, None, None).await
    }

    /// Receive from a named peer: the files land under `<dest>/<datetime> from
    /// <peer>`. The trusted path uses `receive_from_notify` (it also signals
    /// completion); this plain variant is kept for a named receive that needs no ack.
    #[allow(dead_code)]
    pub async fn receive_from(&self, ticket: String, peer: &str) -> Result<String, StartError> {
        self.receive_labelled(ticket, Some(peer), None).await
    }

    /// Like `receive_from`, but runs `on_complete` once the content is fully
    /// received and exported (not on cancel or failure). The trusted path passes
    /// a closure that signs and sends a completion back to the sender.
    pub async fn receive_from_notify(
        &self,
        ticket: String,
        peer: &str,
        on_complete: impl FnOnce() + Send + 'static,
    ) -> Result<String, StartError> {
        self.receive_labelled(ticket, Some(peer), Some(Box::new(on_complete))).await
    }

    async fn receive_labelled(
        &self,
        ticket: String,
        peer: Option<&str>,
        on_complete: Option<CompleteCb>,
    ) -> Result<String, StartError> {
        let ticket: BlobTicket = ticket.trim().parse().map_err(|_| StartError::BadCode)?;
        self.await_free_slot().await?;
        let (id, cancel, done) = self.claim_receive()?;
        let dest = receive_dest(&self.inner.dest_root, peer, &now_stamp());
        self.spawn_receive(ticket, dest, id.clone(), cancel, done, on_complete);
        Ok(id)
    }

    /// Claim the single receive slot, or report Busy. Callers `await_free_slot`
    /// first to wait out an unwinding predecessor. Returns the new transfer's id
    /// and its cancel/done tokens.
    fn claim_receive(&self) -> Result<(String, CancellationToken, CancellationToken), StartError> {
        let mut slots = self.inner.slots.lock().unwrap();
        // Single active session: a live send blocks a new receive too.
        if slots.recv.is_some() || slots.send.is_some() {
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
        on_complete: Option<CompleteCb>,
    ) {
        tracing::info!(id = %id, dest = %dest.display(), "receive: starting");
        let inner = self.inner.clone();
        tokio::spawn(async move {
            run_receive(inner, ticket, dest, id, cancel, done, on_complete).await;
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
        // The send's done token ends the completion wait the moment the send
        // finishes any other way.
        let done = self
            .inner
            .slots
            .lock()
            .unwrap()
            .send
            .as_ref()
            .filter(|s| s.id == id)
            .map(|s| s.done.clone())
            .unwrap_or_default();
        tokio::spawn(async move {
            if let Err(err) = rendezvous_send(&inner, &phrase, &ticket, &run_id, done).await {
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
        self.await_free_slot().await?;
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
                Some(Ok((ticket, mailbox, key))) => {
                    // A code receive carries no trusted identity, so the folder
                    // is datetime-only — the code phrase (a SPAKE2 password) is
                    // never written to disk.
                    let dest = receive_dest(&inner.dest_root, None, &now_stamp());
                    // On full receipt, seal a "done" back over the same mailbox
                    // so the sender finishes even if this fetch moved few or no
                    // bytes (dedup/resume). If sealing fails the mailbox just
                    // closes and the sender falls back to byte count / TTL.
                    let on_complete: Option<CompleteCb> =
                        pake::seal(&key, b"done").ok().map(|sealed| {
                            let mut mailbox = mailbox;
                            Box::new(move || {
                                tokio::spawn(async move {
                                    let _ = mailbox.send(&sealed).await;
                                });
                            }) as CompleteCb
                        });
                    run_receive(inner.clone(), ticket, dest, run_id, cancel, done, on_complete).await;
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

    /// Which kind of transfer currently holds the session, if any. `None` means
    /// idle. Used by the pairing layer to decide whether to auto-decline an
    /// incoming offer (the device runs one transfer at a time).
    pub fn busy_kind(&self) -> Option<Kind> {
        let slots = self.inner.slots.lock().unwrap();
        if slots.send.is_some() {
            Some(Kind::Send)
        } else if slots.recv.is_some() {
            Some(Kind::Receive)
        } else {
            None
        }
    }

    /// Whether a transfer (send or receive) currently holds the session.
    pub fn is_busy(&self) -> bool {
        self.busy_kind().is_some()
    }

    /// Finish the live send with id `id` — the receiver reported it has the
    /// content in full. Idempotent: a no-op if that send already finished (by
    /// byte count or cancel) or never existed, so a completion racing the
    /// byte-count path cannot emit a second `Done`.
    pub fn complete_send(&self, id: &str) {
        finish_send_by_id(&self.inner, id);
    }

    /// Wait out a transfer of EITHER kind that was cancelled but has not finished
    /// unwinding, so the next one can take the single session. A live,
    /// non-cancelled transfer is not waited for — that becomes `Busy` at the
    /// claim check.
    async fn await_free_slot(&self) -> Result<(), StartError> {
        let done = {
            let slots = self.inner.slots.lock().unwrap();
            slots
                .recv
                .as_ref()
                .filter(|s| s.cancelled)
                .map(|s| s.done.clone())
                .or_else(|| slots.send.as_ref().filter(|s| s.cancelled).map(|s| s.done.clone()))
        };
        let Some(done) = done else { return Ok(()) };
        tracing::info!("waiting for a cancelled transfer to unwind");
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
    on_complete: Option<CompleteCb>,
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
        Some(Ok(reported)) => {
            tracing::info!(id = %id, "receive: complete");
            inner.emit(Event::Done { id: id.clone(), kind: Kind::Receive, dest: reported.to_string_lossy().into_owned() });
            // Tell the sender we have it all — its passive send may not otherwise
            // know (a deduped/resumed receive moves fewer bytes than it holds).
            if let Some(cb) = on_complete {
                cb();
            }
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
) -> Result<PathBuf, TransferError> {
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

    // Export each file to the destination folder under its name. iroh-blobs only
    // exports to a path it opens itself, so on every platform this writes to a
    // real (on Android, app-private) path first; the `publish` hook then moves
    // the folder to its user-visible home.
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

    // Move the exported folder to its final, user-visible home if the platform
    // needs it (Android → public Downloads). Desktop/iOS export in place, so the
    // reported destination is `dest` itself.
    let reported = match &inner.publish {
        Some(publish) => publish(dest)
            .map_err(|e| TransferError::new(TransferErrorCode::Storage, e.to_string()))?,
        None => dest.to_path_buf(),
    };

    // Guarantee a final 100% before the Done event (emitted by the caller).
    let final_stats = progress::completed(total, file_count);
    inner.emit(Event::Progress { id: id.to_string(), kind: Kind::Receive, stats: final_stats });
    Ok(reported)
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
                                inner_arc.touch_send(&id);
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

/// Expire a passive send that sits idle past the TTL. Sleeps until the send's
/// idle time would reach the TTL, re-checking on each wake (progress pushes the
/// deadline out). When the deadline passes it frees the slot — dropping the pins
/// so the content can be GC'd — cancels the serve, and signals `done` so a
/// waiting retry can proceed. It emits no `Done`: an expired send delivered
/// nothing. Exits early once the send has finished or been cancelled by any
/// other path (the slot is gone or a different id holds it).
async fn expire_send_loop(inner: Weak<Inner>, id: String, ttl: Duration) {
    loop {
        let wait = {
            let Some(inner) = inner.upgrade() else { return };
            let slots = inner.slots.lock().unwrap();
            match slots.send.as_ref() {
                Some(s) if s.id == id && !s.cancelled => ttl.checked_sub(s.last_active.elapsed()),
                _ => return, // completed, cancelled, or replaced
            }
        };
        match wait {
            // Still within the idle window: sleep the remainder and re-check.
            Some(remaining) if !remaining.is_zero() => tokio::time::sleep(remaining).await,
            // Idle past the TTL — expire it.
            _ => {
                let Some(inner) = inner.upgrade() else { return };
                let mut slots = inner.slots.lock().unwrap();
                if let Some(s) = slots.send.as_ref().filter(|s| s.id == id && !s.cancelled) {
                    let (cancel, done) = (s.cancel.clone(), s.done.clone());
                    slots.send = None; // drops the pins with the slot
                    drop(slots);
                    cancel.cancel();
                    done.cancel();
                    tracing::info!(id = %id, "send: expired (idle past ttl)");
                }
                return;
            }
        }
    }
}

/// Finish the live send with id `id`, reading its total/file-count from the
/// slot. Idempotent: a no-op if that send already finished or never existed.
fn finish_send_by_id(inner: &Inner, id: &str) {
    let (total, file_count) = {
        let slots = inner.slots.lock().unwrap();
        match &slots.send {
            Some(s) if s.id == id => (s.total, s.names.len() as u64),
            _ => return,
        }
    };
    finish_send(inner, id, total, file_count);
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

// ---- quick-share rendezvous (SPAKE2 over the broker mailbox) ----

/// Sender side: join the mailbox, run SPAKE2, and hand the receiver the iroh
/// ticket sealed under the derived key. Then hold the mailbox open until the
/// receiver returns a sealed "done", which finishes a deduped or resumed send
/// whose byte counter never reaches the total. The wait ends the moment the
/// send finishes by any path (`done` fires from the byte-count path, a cancel,
/// or the send-slot TTL), so it can never outlive the send.
async fn rendezvous_send(
    inner: &Inner,
    code: &str,
    ticket: &str,
    id: &str,
    done: CancellationToken,
) -> Result<(), TransferError> {
    let room = codegen::room(code).ok_or_else(|| TransferError::of(TransferErrorCode::Other))?;
    let mut mailbox = client::join(&inner.broker_url, &room).await.map_err(broker_err)?;
    let (handshake, my_msg) = pake::start(code, &room);
    mailbox.send(&my_msg).await.map_err(broker_err)?;
    let peer_msg = mailbox.recv().await.map_err(broker_err)?;
    let key = handshake.finish(&peer_msg).map_err(|_| wrong_code_err())?;
    let sealed = pake::seal(&key, ticket.as_bytes())
        .map_err(|_| TransferError::of(TransferErrorCode::Other))?;
    mailbox.send(&sealed).await.map_err(broker_err)?;

    // The ticket is delivered — the PAKE cannot fail the send from here. Wait for
    // the receiver's completion, but stop as soon as the send finishes some other
    // way. A frame that opens under the shared key is the ack; anything else (a
    // dropped connection, an unopenable frame) just ends the wait.
    tokio::select! {
        _ = done.cancelled() => {}
        frame = mailbox.recv() => {
            if frame.is_ok_and(|f| pake::open(&key, &f).is_ok()) {
                finish_send_by_id(inner, id);
            }
        }
    }
    Ok(())
}

/// Receiver side: join the mailbox, run SPAKE2, and decrypt the sender's ticket.
/// A wrong code fails the PAKE/AEAD, so no ticket is ever revealed. The mailbox
/// and derived key are handed back so the caller can seal a "done" over the same
/// session once the content is received.
async fn rendezvous_receive(
    inner: &Inner,
    code: &str,
    room: &str,
) -> Result<(BlobTicket, client::Mailbox, [u8; 32]), TransferError> {
    let mut mailbox = client::join(&inner.broker_url, room).await.map_err(broker_err)?;
    let (handshake, my_msg) = pake::start(code, room);
    mailbox.send(&my_msg).await.map_err(broker_err)?;
    let peer_msg = mailbox.recv().await.map_err(broker_err)?;
    let key = handshake.finish(&peer_msg).map_err(|_| wrong_code_err())?;
    let sealed = mailbox.recv().await.map_err(broker_err)?;
    let plaintext = pake::open(&key, &sealed).map_err(|_| wrong_code_err())?;
    let ticket = String::from_utf8(plaintext).map_err(|_| wrong_code_err())?;
    let ticket = ticket
        .trim()
        .parse::<BlobTicket>()
        .map_err(|_| TransferError::new(TransferErrorCode::BadTicket, "The sender's ticket was invalid."))?;
    Ok((ticket, mailbox, key))
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
                send_ttl: Duration::from_secs(300), // long: these tests don't exercise expiry
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
            // Datetime-stamped (`YYYY-MM-DD HH-MM-SS`), not a code phrase: 4-digit
            // year, `-` and ` ` separators in the fixed positions.
            let name = folder.file_name().unwrap().to_string_lossy().into_owned();
            assert!(
                name.len() >= 19 && name.as_bytes()[4] == b'-' && name.as_bytes()[10] == b' ',
                "folder {name} is not a datetime stamp"
            );
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
        // Flat under the root, in a `<datetime> from <device>` folder — the
        // trusted sender's name is the trailing segment, not a parent shelf.
        let folder = file.parent().unwrap();
        assert_eq!(folder.parent().unwrap(), tmp.path().join("r-dl"));
        let name = folder.file_name().unwrap().to_string_lossy().into_owned();
        assert!(name.ends_with(" from Workshop PC"), "folder {name} missing sender segment");
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

    /// Single active session: a live send blocks a new receive on the same
    /// device. A trusted offer waiting for accept is exactly this — a held send.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn a_live_send_blocks_a_new_receive() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "hold.bin", &vec![1u8; 100_000]);
        let se = Collector::default();
        let m = manager(tmp.path(), "m", Arc::new(se.clone())).await;

        // The passive send holds the session (no receiver; the TTL is long here).
        m.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        let ticket = ticket_of(&se.events());

        assert_eq!(m.receive(ticket).await.unwrap_err(), StartError::Busy);
    }

    /// Single active session: a live receive blocks a new send on the same
    /// device. The receive holds the session by blocking in rendezvous for a
    /// sender that never joins.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn a_live_receive_blocks_a_new_send() {
        let tmp = tempfile::tempdir().unwrap();
        let broker = spawn_mock_broker().await;
        let m = quick_manager(tmp.path(), "m", &broker, Arc::new(Collector::default())).await;

        // Claims the session, then blocks awaiting a peer that never comes.
        m.quick_receive("4821-crayon-mimic-otter").await.unwrap();

        let src = write_file(tmp.path(), "x.bin", &vec![2u8; 20_000]);
        assert_eq!(m.send(vec![src]).await.unwrap_err(), StartError::Busy);
    }

    /// The session frees on a terminal event: a device can send once the receive
    /// it just finished has released the session.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn session_frees_after_a_terminal_event() {
        let tmp = tempfile::tempdir().unwrap();
        let src = write_file(tmp.path(), "c.bin", &vec![3u8; 150_000]);
        let se = Collector::default();
        let re = Collector::default();
        let sender = manager(tmp.path(), "s", Arc::new(se.clone())).await;
        let receiver = manager(tmp.path(), "r", Arc::new(re.clone())).await;

        sender.send(vec![src]).await.unwrap();
        wait_for(&se, |e| e.iter().any(|x| matches!(x, Event::Code { .. }))).await;
        receiver.receive(ticket_of(&se.events())).await.unwrap();
        wait_for(&re, |e| e.iter().any(|x| matches!(x, Event::Done { .. }))).await;
        wait_for_manager_idle(&receiver).await;

        // Session free again → the receiver can now start a send.
        let out = write_file(tmp.path(), "reply.bin", &vec![4u8; 40_000]);
        receiver.send(vec![out]).await.unwrap();
    }

    /// A passive send no one fetches expires on the TTL — freeing the slot and
    /// emitting no `Done` — while a send that keeps making progress is left
    /// alone.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn idle_send_expires_but_active_send_survives() {
        let tmp = tempfile::tempdir().unwrap();
        let ttl = Duration::from_millis(200);
        let se = Collector::default();
        let sender = Manager::new(
            Config {
                store_path: Some(tmp.path().join("s")),
                dest_root: tmp.path().join("s-dl"),
                relay: RelayConfig::DisableRelay,
                bind_addr: Some("127.0.0.1:0".into()),
                broker_url: "ws://127.0.0.1:1/ws".into(),
                send_ttl: ttl,
            },
            Arc::new(se.clone()),
        )
        .await
        .unwrap();

        // Never fetched: the send expires and frees the slot.
        let src = write_file(tmp.path(), "idle.bin", &vec![1u8; 50_000]);
        sender.send(vec![src]).await.unwrap();
        let mut freed = false;
        for _ in 0..200 {
            if sender.inner.slots.lock().unwrap().send.is_none() {
                freed = true;
                break;
            }
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
        assert!(freed, "an idle send should expire and free the slot");
        // Expiry delivered nothing, so there is no send `Done`.
        assert!(
            !se.events().iter().any(|e| matches!(e, Event::Done { kind: Kind::Send, .. })),
            "an expired send must not emit Done"
        );

        // The freed slot accepts a new send (not Busy).
        let src2 = write_file(tmp.path(), "next.bin", &vec![2u8; 20_000]);
        let id2 = sender.send(vec![src2]).await.unwrap();

        // Keep it active — touch faster than the TTL over a span exceeding it —
        // and it must not be reaped.
        for _ in 0..8 {
            tokio::time::sleep(ttl / 2).await;
            sender.inner.touch_send(&id2);
        }
        assert!(
            sender.inner.slots.lock().unwrap().send.is_some(),
            "an actively-progressing send must not expire"
        );
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
                send_ttl: Duration::from_secs(300),
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

        // A code receive lands in a datetime folder directly under the root; the
        // code phrase (a SPAKE2 password) never appears in the path.
        let root = tmp.path().join("r-dl");
        let file = walk(&root)
            .into_iter()
            .find(|p| p.file_name().unwrap() == "quick.bin")
            .expect("quick.bin was not exported");
        assert_eq!(std::fs::read(&file).unwrap(), payload);
        let folder = file.parent().unwrap();
        assert_eq!(folder.parent().unwrap(), root);
        let name = folder.file_name().unwrap().to_string_lossy().into_owned();
        assert!(!name.contains(phrase.as_str()), "code phrase {phrase} leaked into path {name}");
        assert!(
            name.len() == 19 && name.as_bytes()[4] == b'-' && name.as_bytes()[10] == b' ',
            "folder {name} is not a datetime stamp"
        );
    }

    /// The code-share twin of the trusted dedup regression: the second time the
    /// same file is shared to the same receiver, its fetch moves ~no bytes
    /// (BLAKE3 dedup), so the sender's byte counter never trips. Only the
    /// receiver's sealed "done" over the mailbox finishes the send.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn deduped_quick_share_still_completes() {
        let tmp = tempfile::tempdir().unwrap();
        let broker = spawn_mock_broker().await;
        let src = write_file(tmp.path(), "dup.bin", &vec![9u8; 250_000]);

        let se = Collector::default();
        let re = Collector::default();
        let sender = quick_manager(tmp.path(), "s", &broker, Arc::new(se.clone())).await;
        let receiver = quick_manager(tmp.path(), "r", &broker, Arc::new(re.clone())).await;

        let send_dones = |e: &[Event]| {
            e.iter().filter(|x| matches!(x, Event::Done { kind: Kind::Send, .. })).count()
        };
        let recv_dones = |e: &[Event]| {
            e.iter().filter(|x| matches!(x, Event::Done { kind: Kind::Receive, .. })).count()
        };
        let latest_code = |c: &Collector| {
            c.events().iter().rev().find_map(|e| match e {
                Event::Code { code, .. } => Some(code.clone()),
                _ => None,
            })
        };

        for round in 1..=2 {
            sender.quick_share(vec![src.clone()]).await.unwrap();
            wait_for(&se, |e| {
                e.iter().filter(|x| matches!(x, Event::Code { .. })).count() >= round
            })
            .await;
            let phrase = latest_code(&se).unwrap();
            receiver.quick_receive(&phrase).await.unwrap();
            wait_for(&re, move |e| recv_dones(e) >= round).await;
            // The crux: round 2 is deduped on the receiver, yet the sender still
            // reaches a Send `Done` — via the sealed completion, not byte count.
            wait_for(&se, move |e| send_dones(e) >= round).await;
            wait_for_manager_idle(&receiver).await;
        }
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
