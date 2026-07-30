// Trusted-device orchestration: ties the pairing core (identity, trust, signed
// offers) to the fingerprint broker and the transport. Sender signs an offer
// carrying its iroh ticket and routes it by fingerprint; the receiver verifies
// trust + signature, prompts the user, and on accept fetches the offer's ticket
// — dialing only the NodeId the verified offer carries. No croc code, no shared
// secret in the transfer path.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tokio::sync::oneshot;
use tokio::time::timeout;

use crate::pairing::broker::{connect, FpClient, Incoming};
use crate::pairing::identity::{Identity, PublicKey};
use crate::pairing::offer::{Offer, VerifyError};
use crate::pairing::sas::sas;
use crate::pairing::self_name::SelfName;
use crate::pairing::signal::Signal;
use crate::pairing::trust::{TrustStore, TrustedDevice};
use crate::rendezvous::{client, code, pake};
use crate::transport::Manager;

/// How long a shown pairing code stays valid — the device keeps the mailbox
/// session this long, then drops it silently (showing a code you never use is
/// not an error). Also bounds how long a redeemer waits for the other side.
const PAIR_TIMEOUT: Duration = Duration::from_secs(120);

/// Pairings shown on this device awaiting the user's confirm: fingerprint → the
/// channel the mailbox task blocks on. `Some(name)` confirms and trusts the peer
/// under `name`; `None` declines. Trust is written only on confirm.
type PendingConfirms = Arc<Mutex<HashMap<String, oneshot::Sender<Option<String>>>>>;

/// What each device seals to the other during a code pairing: its public
/// identity, its self-name, and how the code was redeemed ("qr" | "code") so the
/// device that showed the code can decide whether to show an SAS to compare.
#[derive(Serialize, Deserialize)]
struct CodePairPayload {
    id: String,
    name: String,
    #[serde(default)]
    via: String,
}

/// What the service tells the UI. Translated to frontend events by the caller.
pub enum PairingEvent {
    /// A verified incoming offer awaits the user's accept/decline.
    Offer { transfer_id: String, from_name: String, file_count: u64, total_bytes: u64 },
    /// The peer accepted our offer (its side is now fetching).
    Accepted,
    /// The peer declined our offer.
    Declined,
    /// A device redeemed a code we are showing and awaits our confirmation
    /// before we trust it. `sas` is the short auth string to compare; `via` is
    /// how the peer redeemed ("qr" | "code") — the UI shows the SAS only for a
    /// typed code.
    Request { fingerprint: String, suggested_name: String, sas: String, via: String },
    /// A pairing completed; `name` is the newly trusted device.
    Paired { name: String },
    /// A pairing/signalling error to surface (e.g. device offline).
    Error { message: String },
}

pub trait PairingEmitter: Send + Sync + 'static {
    fn emit(&self, event: PairingEvent);
}

/// The trusted-device service. Cheap to hold in app state.
pub struct PairingService {
    identity: Arc<Identity>,
    self_name: Arc<SelfName>,
    trust: Arc<TrustStore>,
    manager: Manager,
    broker: FpClient,
    emit: Arc<dyn PairingEmitter>,
    /// The broker's code-mailbox URL (`…/ws`), used to rendezvous a code pairing.
    mailbox_url: String,
    /// Verified incoming offers keyed by transfer id, awaiting accept/decline.
    pending: Arc<Mutex<HashMap<String, Offer>>>,
    /// Codes shown on this device whose redeemer awaits our confirm.
    pending_confirms: PendingConfirms,
}

impl PairingService {
    /// Load (or create) the identity + trust store under `dir`, connect to the
    /// broker's fingerprint mode, and start handling incoming signals. `fp_url`
    /// is the broker's fingerprint-routing URL (`…/fp`) — pairing and offers
    /// both ride it. Must be called from within a Tokio runtime.
    pub fn new(
        dir: &Path,
        manager: Manager,
        fp_url: String,
        mailbox_url: String,
        emit: Arc<dyn PairingEmitter>,
    ) -> Result<PairingService, String> {
        let identity = Arc::new(Identity::load_or_create(dir)?);
        let self_name = Arc::new(SelfName::load_or_create(dir)?);
        let trust = Arc::new(TrustStore::load(dir)?);
        let (broker, incoming) = connect(fp_url, &identity);

        let svc = PairingService {
            identity,
            self_name,
            trust: trust.clone(),
            manager: manager.clone(),
            broker: broker.clone(),
            emit: emit.clone(),
            mailbox_url,
            pending: Arc::new(Mutex::new(HashMap::new())),
            pending_confirms: Arc::new(Mutex::new(HashMap::new())),
        };

        // Background loop: verify and dispatch every incoming offer/response.
        tokio::spawn(incoming_loop(Loop {
            incoming,
            trust,
            manager,
            emit,
            pending: svc.pending.clone(),
        }));
        Ok(svc)
    }

    /// Show a pairing code on this device (also encode it as a QR). A background
    /// task joins the broker's code-mailbox for the code's room and completes one
    /// pairing: it waits for a redeemer, runs SPAKE2, learns the redeemer's
    /// identity, raises a confirm request, and — once the user confirms — seals
    /// this device's identity back so both sides end up trusting each other.
    /// Single-use, and bounded by `PAIR_TIMEOUT`; an unredeemed code expires
    /// quietly with no error to the UI.
    pub fn show_pair_code(&self) -> Result<String, String> {
        let phrase = code::generate();
        let room = code::room(&phrase).ok_or("could not derive a room from the code")?;
        let task = ShowTask {
            mailbox_url: self.mailbox_url.clone(),
            code: phrase.clone(),
            room,
            identity: self.identity.clone(),
            self_name: self.self_name.clone(),
            trust: self.trust.clone(),
            emit: self.emit.clone(),
            pending_confirms: self.pending_confirms.clone(),
        };
        tokio::spawn(async move {
            if let Err(e) = timeout(PAIR_TIMEOUT, task.run()).await.unwrap_or(Ok(())) {
                tracing::debug!(error = %e, "pairing: show-code session ended");
            }
        });
        Ok(phrase)
    }

    /// Redeem a pairing code shown on another device. `via` records how the code
    /// arrived ("qr" | "code") so the other device can decide whether to show an
    /// SAS. Runs SPAKE2 over the mailbox, sends this device's identity, and on the
    /// other side's confirmed reply trusts it and reports paired.
    pub async fn redeem_pair_code(&self, raw_code: &str, via: &str) -> Result<(), String> {
        let phrase = code::normalize(raw_code);
        let room = code::room(&phrase).ok_or("that does not look like a code")?;
        let mut mailbox = client::join(&self.mailbox_url, &room).await?;

        // SPAKE2 — the redeemer speaks first.
        let (handshake, my_msg) = pake::start(&phrase, &room);
        mailbox.send(&my_msg).await?;
        let peer_msg = timeout(PAIR_TIMEOUT, mailbox.recv()).await.map_err(|_| pair_wait_timeout())??;
        let key = handshake.finish(&peer_msg)?;

        // Seal and send our identity + self-name + how we redeemed.
        let payload = serde_json::to_vec(&CodePairPayload {
            id: self.identity.public().encode(),
            name: self.self_name.get(),
            via: via.to_string(),
        })
        .map_err(|e| e.to_string())?;
        mailbox.send(&pake::seal(&key, &payload)?).await?;

        // Wait for the shower's reply: `0x01 ‖ sealed(identity)` on confirm, or a
        // lone `0x00` on decline.
        let reply = timeout(PAIR_TIMEOUT, mailbox.recv()).await.map_err(|_| pair_wait_timeout())??;
        match reply.split_first() {
            Some((1, sealed)) => {
                let opened = pake::open(&key, sealed)?;
                let peer: CodePairPayload =
                    serde_json::from_slice(&opened).map_err(|e| format!("bad pairing reply: {e}"))?;
                let peer_key = PublicKey::decode(&peer.id)?;
                let fingerprint = peer_key.fingerprint();
                self.trust.add(peer_key, &peer.name)?;
                let name = self.trust.get(&fingerprint).map_or(peer.name, |d| d.label());
                self.emit.emit(PairingEvent::Paired { name });
                Ok(())
            }
            Some((0, _)) => Err("The other device didn't add this one.".into()),
            _ => Err("The other device sent something unexpected.".into()),
        }
    }

    /// This device's encoded public identity (QR / copy).
    pub fn identity(&self) -> String {
        self.identity.public().encode()
    }

    /// This device's current self-name, advertised to peers during pairing and
    /// on transfer offers.
    pub fn self_name(&self) -> String {
        self.self_name.get()
    }

    /// Rename this device. The new self-name is advertised to peers thereafter.
    pub fn set_self_name(&self, name: &str) -> Result<(), String> {
        self.self_name.set(name)
    }

    pub fn trusted_devices(&self) -> Vec<TrustedDevice> {
        self.trust.list()
    }

    /// Trust a device from its encoded public identity. A test helper for
    /// seeding a mutual trust relationship without running the code exchange.
    #[cfg(test)]
    pub fn trust(&self, encoded: &str, name: &str) -> Result<(), String> {
        let pk = crate::pairing::identity::PublicKey::decode(encoded)?;
        self.trust.add(pk, name)
    }

    pub fn untrust(&self, fingerprint: &str) -> Result<(), String> {
        self.trust.remove(fingerprint)
    }

    /// Approve a pending pairing (raised as `PairingEvent::Request`): trust the
    /// peer under `name` and report it paired. Unknown fingerprint means the
    /// request expired or was already handled.
    pub fn confirm_pair(&self, fingerprint: &str, name: &str) -> Result<(), String> {
        let tx = self
            .pending_confirms
            .lock()
            .unwrap()
            .remove(fingerprint)
            .ok_or("no such pairing request")?;
        // The mailbox task trusts the peer and seals our identity back once it
        // sees the name; a send failure means the code already expired.
        tx.send(Some(name.to_string())).map_err(|_| "that pairing request expired".to_string())
    }

    /// Discard a pending pairing without trusting the peer. The mailbox task
    /// tells the other side it was declined, then ends.
    pub fn dismiss_pair(&self, fingerprint: &str) {
        if let Some(tx) = self.pending_confirms.lock().unwrap().remove(fingerprint) {
            let _ = tx.send(None);
        }
    }

    /// Rename an already-trusted device.
    pub fn rename_device(&self, fingerprint: &str, name: &str) -> Result<(), String> {
        self.trust.rename(fingerprint, name)
    }

    /// Offer files to a trusted device. Serves the files, signs an offer with
    /// the resulting ticket, and routes it by fingerprint. The transfer starts
    /// when the peer accepts (it fetches the ticket); a decline cancels it.
    pub async fn send_to(&self, fingerprint: &str, paths: Vec<PathBuf>) -> Result<String, String> {
        if self.trust.get(fingerprint).is_none() {
            return Err("not a trusted device".into());
        }
        let total_bytes: u64 =
            paths.iter().filter_map(|p| std::fs::metadata(p).ok()).map(|m| m.len()).sum();
        let file_count = paths.len() as u64;

        let (id, ticket, _served) =
            self.manager.start_send(paths).await.map_err(|e| e.to_string())?;
        let ts = now_unix();
        let offer =
            self.identity.sign_offer(&id, ts, file_count, total_bytes, &ticket, &self.self_name.get());
        self.broker.send(fingerprint, &Signal::Offer(offer));
        Ok(id)
    }

    /// Accept a pending offer: sign a response, tell the sender, and fetch the
    /// offer's ticket (dialing the verified NodeId).
    pub async fn accept(&self, transfer_id: &str) -> Result<String, String> {
        let offer = self
            .pending
            .lock()
            .unwrap()
            .remove(transfer_id)
            .ok_or("no such incoming offer")?;
        let resp = self.identity.sign_response(transfer_id, true);
        self.broker.send(&offer.from.fingerprint(), &Signal::Response(resp));
        self.manager.receive(offer.ticket).await.map_err(|e| e.to_string())
    }

    /// Decline a pending offer: tell the sender so it can stop serving.
    pub async fn decline(&self, transfer_id: &str) -> Result<(), String> {
        let offer = self
            .pending
            .lock()
            .unwrap()
            .remove(transfer_id)
            .ok_or("no such incoming offer")?;
        let resp = self.identity.sign_response(transfer_id, false);
        self.broker.send(&offer.from.fingerprint(), &Signal::Response(resp));
        Ok(())
    }
}

/// A code-pairing session for a code this device is showing. Owns the mailbox
/// for its whole life so it can pause between learning the redeemer's identity
/// and the user's confirm, then seal our identity back. Holds Arc clones of the
/// service state so it outlives the `show_pair_code` call.
struct ShowTask {
    mailbox_url: String,
    code: String,
    room: String,
    identity: Arc<Identity>,
    self_name: Arc<SelfName>,
    trust: Arc<TrustStore>,
    emit: Arc<dyn PairingEmitter>,
    pending_confirms: PendingConfirms,
}

impl ShowTask {
    async fn run(self) -> Result<(), String> {
        let mut mailbox = client::join(&self.mailbox_url, &self.room).await?;

        // SPAKE2 — the redeemer speaks first; we reply.
        let peer_msg = mailbox.recv().await?;
        let (handshake, my_msg) = pake::start(&self.code, &self.room);
        mailbox.send(&my_msg).await?;
        let key = handshake.finish(&peer_msg)?;

        // Open the redeemer's sealed identity. A wrong code yields a different
        // key, so this fails and the session ends without touching trust.
        let opened = pake::open(&key, &mailbox.recv().await?)?;
        let peer: CodePairPayload =
            serde_json::from_slice(&opened).map_err(|e| format!("bad pairing payload: {e}"))?;
        let peer_key = PublicKey::decode(&peer.id)?;
        let fingerprint = peer_key.fingerprint();
        // SAS from the ECDH shared secret; the UI shows it only for a typed code.
        let sas = self.identity.shared_secret(&peer_key).map(|s| sas(&s)).unwrap_or_default();

        // Raise the confirm and wait for the user's decision.
        let (tx, rx) = oneshot::channel::<Option<String>>();
        self.pending_confirms.lock().unwrap().insert(fingerprint.clone(), tx);
        self.emit.emit(PairingEvent::Request {
            fingerprint: fingerprint.clone(),
            suggested_name: peer.name.clone(),
            sas,
            via: peer.via.clone(),
        });

        match rx.await {
            Ok(Some(name)) => {
                self.trust.add(peer_key, &name)?;
                let reply = serde_json::to_vec(&CodePairPayload {
                    id: self.identity.public().encode(),
                    name: self.self_name.get(),
                    via: String::new(),
                })
                .map_err(|e| e.to_string())?;
                let mut blob = vec![1u8];
                blob.extend_from_slice(&pake::seal(&key, &reply)?);
                mailbox.send(&blob).await?;
                let name = self.trust.get(&fingerprint).map_or(name, |d| d.label());
                self.emit.emit(PairingEvent::Paired { name });
            }
            // Declined or the confirm channel dropped: tell the redeemer so it
            // stops waiting, then end.
            _ => {
                self.pending_confirms.lock().unwrap().remove(&fingerprint);
                let _ = mailbox.send(&[0u8]).await;
            }
        }
        Ok(())
    }
}

/// The friendly timeout message a redeemer sees when the other device never
/// completes the exchange.
fn pair_wait_timeout() -> String {
    "The other device didn't respond. Make sure it's showing the code, then try again.".to_string()
}

/// What the incoming-signal loop needs: it now only routes verified offers and
/// responses over the fingerprint channel (pairing moved to the code mailbox).
struct Loop {
    incoming: tokio::sync::mpsc::UnboundedReceiver<Incoming>,
    trust: Arc<TrustStore>,
    manager: Manager,
    emit: Arc<dyn PairingEmitter>,
    pending: Arc<Mutex<HashMap<String, Offer>>>,
}

async fn incoming_loop(mut l: Loop) {
    while let Some(msg) = l.incoming.recv().await {
        match msg {
            Incoming::Signal(Signal::Offer(offer)) => match offer.verify(&l.trust) {
                Ok(()) => {
                    // Refresh the peer's advertised name from the signed offer
                    // (a no-op if the user set a local override), then show it.
                    let fp = offer.from.fingerprint();
                    let _ = l.trust.refresh_advertised(&fp, &offer.self_name);
                    let from_name = l.trust.get(&fp).map(|d| d.label()).unwrap_or_default();
                    let ev = PairingEvent::Offer {
                        transfer_id: offer.transfer_id.clone(),
                        from_name,
                        file_count: offer.file_count,
                        total_bytes: offer.total_bytes,
                    };
                    l.pending.lock().unwrap().insert(offer.transfer_id.clone(), offer);
                    l.emit.emit(ev);
                }
                Err(VerifyError::Untrusted) => tracing::warn!("pairing: offer from untrusted device"),
                Err(VerifyError::BadSignature) => tracing::warn!("pairing: offer with bad signature"),
            },
            Incoming::Signal(Signal::Response(resp)) => {
                if resp.verify(&l.trust).is_ok() {
                    if resp.accept {
                        l.emit.emit(PairingEvent::Accepted);
                    } else {
                        l.emit.emit(PairingEvent::Declined);
                        l.manager.cancel(crate::transport::Kind::Send);
                    }
                }
            }
            Incoming::Unreachable(fp) => {
                tracing::info!(fp = %fp, "pairing: target offline");
                l.emit.emit(PairingEvent::Error { message: "The device is offline.".into() });
            }
        }
    }
}

fn now_unix() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pairing::identity::PublicKey;
    use crate::transport::{Config, Emitter as TEmitter, Event as TEvent, RelayConfig};
    use std::io::Write;
    use std::time::Duration;

    #[derive(Clone, Default)]
    struct PairCollector(Arc<Mutex<Vec<String>>>);
    impl PairingEmitter for PairCollector {
        fn emit(&self, e: PairingEvent) {
            let tag = match e {
                PairingEvent::Offer { transfer_id, .. } => format!("offer:{transfer_id}"),
                PairingEvent::Accepted => "accepted".into(),
                PairingEvent::Declined => "declined".into(),
                PairingEvent::Request { fingerprint, .. } => format!("request:{fingerprint}"),
                PairingEvent::Paired { name } => format!("paired:{name}"),
                PairingEvent::Error { message } => format!("error:{message}"),
            };
            self.0.lock().unwrap().push(tag);
        }
    }
    impl PairCollector {
        fn tags(&self) -> Vec<String> {
            self.0.lock().unwrap().clone()
        }
        fn offer_id(&self) -> Option<String> {
            self.tags().iter().find_map(|t| t.strip_prefix("offer:").map(String::from))
        }
    }

    #[derive(Clone, Default)]
    struct DoneFlag(Arc<Mutex<bool>>);
    impl TEmitter for DoneFlag {
        fn emit(&self, e: TEvent) {
            if let TEvent::Done { kind: crate::transport::Kind::Receive, .. } = e {
                *self.0.lock().unwrap() = true;
            }
        }
    }

    async fn manager(dir: &Path, name: &str, emit: Arc<dyn TEmitter>) -> Manager {
        Manager::new(
            Config {
                store_path: Some(dir.join(name)),
                dest_root: dir.join(format!("{name}-dl")),
                relay: RelayConfig::DisableRelay,
                bind_addr: Some("127.0.0.1:0".into()),
                broker_url: "ws://127.0.0.1:1/ws".into(), // unused by pairing
            },
            emit,
        )
        .await
        .unwrap()
    }

    /// In-process stand-in for the Go broker's fingerprint mode: register by the
    /// fingerprint derived from the encoded key, then relay signal blobs to the
    /// target fingerprint (mirrors broker/fproute.go; the Go side has its own
    /// tests, this exercises the Rust client + service + transport together).
    async fn spawn_mock_fp_broker() -> String {
        use futures_util::{SinkExt, StreamExt as _};
        use std::collections::HashMap;
        use tokio::sync::mpsc;
        use tokio::sync::Mutex as AsyncMutex;
        use tokio_tungstenite::tungstenite::Message;

        #[derive(serde::Deserialize)]
        struct In {
            #[serde(rename = "type")]
            typ: String,
            key: Option<String>,
            to: Option<String>,
            blob: Option<String>,
        }

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let peers: Arc<AsyncMutex<HashMap<String, mpsc::UnboundedSender<Message>>>> =
            Arc::new(AsyncMutex::new(HashMap::new()));

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let peers = peers.clone();
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

                    // Register.
                    let fp = match futures_util::StreamExt::next(&mut read).await {
                        Some(Ok(Message::Text(t))) => {
                            let m: In = serde_json::from_str(&t).unwrap();
                            let key = m.key.unwrap_or_default();
                            PublicKey::decode(&key).unwrap().fingerprint()
                        }
                        _ => return,
                    };
                    peers.lock().await.insert(fp.clone(), tx.clone());
                    let _ = tx.send(Message::text(r#"{"type":"ok"}"#.to_string()));

                    // Relay signals by target fingerprint.
                    while let Some(Ok(Message::Text(t))) =
                        futures_util::StreamExt::next(&mut read).await
                    {
                        let m: In = serde_json::from_str(&t).unwrap_or(In {
                            typ: String::new(),
                            key: None,
                            to: None,
                            blob: None,
                        });
                        if m.typ != "signal" {
                            continue;
                        }
                        let to = m.to.unwrap_or_default();
                        let blob = m.blob.unwrap_or_default();
                        let peers = peers.lock().await;
                        if let Some(peer) = peers.get(&to) {
                            let out = serde_json::json!({"type":"signal","blob":blob}).to_string();
                            let _ = peer.send(Message::text(out));
                        }
                    }
                    peers.lock().await.remove(&fp);
                });
            }
        });
        format!("ws://{addr}/fp")
    }

    /// In-process stand-in for the Go broker's code-mailbox mode: join a room,
    /// pair up to two clients in it, and relay `msg` blobs between them (mirrors
    /// broker/mailbox.go). Enough to exercise the code-pairing exchange without
    /// the Go broker.
    async fn spawn_mock_mailbox_broker() -> String {
        use futures_util::{SinkExt, StreamExt as _};
        use std::collections::HashMap;
        use tokio::sync::mpsc;
        use tokio::sync::Mutex as AsyncMutex;
        use tokio_tungstenite::tungstenite::Message;

        #[derive(serde::Deserialize)]
        struct In {
            #[serde(rename = "type")]
            typ: String,
            room: Option<String>,
            data: Option<String>,
        }

        // Like broker/mailbox.go: buffer blobs sent before the second party
        // arrives so SPAKE2's first message is not lost to a connect race.
        #[derive(Default)]
        struct RoomState {
            peers: Vec<mpsc::UnboundedSender<Message>>,
            buffered: Vec<String>,
        }

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let rooms: Arc<AsyncMutex<HashMap<String, RoomState>>> =
            Arc::new(AsyncMutex::new(HashMap::new()));

        fn relay_frame(data: &str) -> Message {
            Message::text(serde_json::json!({ "type": "msg", "data": data }).to_string())
        }

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

                    // First frame joins a room; the newcomer drains any backlog.
                    let room = match futures_util::StreamExt::next(&mut read).await {
                        Some(Ok(Message::Text(t))) => {
                            let m: In = serde_json::from_str(&t).unwrap();
                            m.room.unwrap_or_default()
                        }
                        _ => return,
                    };
                    let backlog = {
                        let mut g = rooms.lock().await;
                        let rm = g.entry(room.clone()).or_default();
                        if rm.peers.len() >= 2 {
                            let _ = tx.send(Message::text(r#"{"type":"full"}"#.to_string()));
                            return;
                        }
                        rm.peers.push(tx.clone());
                        std::mem::take(&mut rm.buffered)
                    };
                    for d in backlog {
                        let _ = tx.send(relay_frame(&d));
                    }

                    // Relay each message to the other party, or buffer it if the
                    // peer has not joined yet.
                    while let Some(Ok(Message::Text(t))) =
                        futures_util::StreamExt::next(&mut read).await
                    {
                        let m: In = serde_json::from_str(&t)
                            .unwrap_or(In { typ: String::new(), room: None, data: None });
                        if m.typ != "msg" {
                            continue;
                        }
                        let data = m.data.unwrap_or_default();
                        let mut g = rooms.lock().await;
                        if let Some(rm) = g.get_mut(&room) {
                            let others: Vec<_> =
                                rm.peers.iter().filter(|p| !p.same_channel(&tx)).cloned().collect();
                            if others.is_empty() {
                                rm.buffered.push(data);
                            } else {
                                for p in others {
                                    let _ = p.send(relay_frame(&data));
                                }
                            }
                        }
                    }
                });
            }
        });
        format!("ws://{addr}/ws")
    }

    fn write_file(dir: &Path, name: &str, bytes: &[u8]) -> PathBuf {
        let p = dir.join(name);
        std::fs::File::create(&p).unwrap().write_all(bytes).unwrap();
        p
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn trusted_send_receive_end_to_end() {
        let tmp = tempfile::tempdir().unwrap();
        let broker = spawn_mock_fp_broker().await;
        let payload = vec![6u8; 200_000];
        let src = write_file(tmp.path(), "trusted.bin", &payload);

        // Sender A and receiver B: each a transport Manager + a PairingService.
        let a_mgr = manager(tmp.path(), "a", Arc::new(DoneFlag::default())).await;
        let b_done = DoneFlag::default();
        let b_mgr = manager(tmp.path(), "b", Arc::new(b_done.clone())).await;

        let a_events = PairCollector::default();
        let b_events = PairCollector::default();
        let dir_a = tmp.path().join("id-a");
        let dir_b = tmp.path().join("id-b");
        let dummy_mailbox = "ws://127.0.0.1:1/ws".to_string();
        let a = PairingService::new(&dir_a, a_mgr, broker.clone(), dummy_mailbox.clone(), Arc::new(a_events.clone())).unwrap();
        let b = PairingService::new(&dir_b, b_mgr, broker.clone(), dummy_mailbox, Arc::new(b_events.clone())).unwrap();

        // Give both clients a moment to register with the broker.
        tokio::time::sleep(Duration::from_millis(200)).await;

        // Pair: each device trusts the other's identity.
        let b_fp = PublicKey::decode(&b.identity()).unwrap().fingerprint();
        a.trust(&b.identity(), "device-b").unwrap();
        b.trust(&a.identity(), "device-a").unwrap();

        // A offers the file to B.
        a.send_to(&b_fp, vec![src]).await.unwrap();

        // B sees the offer, accepts, and the transfer completes.
        wait_until(Duration::from_secs(10), || b_events.offer_id().is_some()).await;
        let transfer_id = b_events.offer_id().unwrap();
        b.accept(&transfer_id).await.unwrap();
        wait_until(Duration::from_secs(15), || *b_done.0.lock().unwrap()).await;

        // A was told its offer was accepted.
        assert!(a_events.tags().iter().any(|t| t == "accepted"));

        // Received bytes match.
        let got = walk(&tmp.path().join("b-dl"))
            .into_iter()
            .find(|p| p.file_name().unwrap() == "trusted.bin")
            .map(|p| std::fs::read(&p).unwrap());
        assert_eq!(got.as_deref(), Some(&payload[..]));
    }

    /// Live cross-language check: a trusted-device transfer over a REAL Go
    /// broker (fingerprint mode), not the mock — proves the Rust fp client wire
    /// matches broker/fproute.go. Gated on `FLOPPY_TEST_BROKER` (the `…/ws` URL;
    /// the service derives `…/fp`).
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore = "needs a running Go broker at FLOPPY_TEST_BROKER"]
    async fn live_trusted_transfer_against_real_broker() {
        let Ok(ws) = std::env::var("FLOPPY_TEST_BROKER") else { return };
        // FLOPPY_TEST_BROKER is the `…/ws` URL; the fp channel dials `…/fp`.
        let broker = format!("{}/fp", ws.strip_suffix("/ws").unwrap_or(&ws));
        let tmp = tempfile::tempdir().unwrap();
        let payload = vec![9u8; 250_000];
        let src = write_file(tmp.path(), "live-trusted.bin", &payload);

        let a_mgr = manager(tmp.path(), "la", Arc::new(DoneFlag::default())).await;
        let b_done = DoneFlag::default();
        let b_mgr = manager(tmp.path(), "lb", Arc::new(b_done.clone())).await;
        let a_events = PairCollector::default();
        let b_events = PairCollector::default();
        let a = PairingService::new(&tmp.path().join("lid-a"), a_mgr, broker.clone(), ws.clone(), Arc::new(a_events.clone())).unwrap();
        let b = PairingService::new(&tmp.path().join("lid-b"), b_mgr, broker.clone(), ws.clone(), Arc::new(b_events.clone())).unwrap();
        tokio::time::sleep(Duration::from_millis(400)).await; // register with the real broker

        let b_fp = PublicKey::decode(&b.identity()).unwrap().fingerprint();
        a.trust(&b.identity(), "device-b").unwrap();
        b.trust(&a.identity(), "device-a").unwrap();

        a.send_to(&b_fp, vec![src]).await.unwrap();
        wait_until(Duration::from_secs(10), || b_events.offer_id().is_some()).await;
        let id = b_events.offer_id().unwrap();
        b.accept(&id).await.unwrap();
        wait_until(Duration::from_secs(20), || *b_done.0.lock().unwrap()).await;

        let got = walk(&tmp.path().join("lb-dl"))
            .into_iter()
            .find(|p| p.file_name().unwrap() == "live-trusted.bin")
            .map(|p| std::fs::read(&p).unwrap());
        assert_eq!(got.as_deref(), Some(&payload[..]));
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn code_pairing_makes_trust_mutual() {
        let tmp = tempfile::tempdir().unwrap();
        // Construction registers on the fp broker; the pairing itself rides the
        // code mailbox.
        let fp = spawn_mock_fp_broker().await;
        let mailbox = spawn_mock_mailbox_broker().await;

        let a_mgr = manager(tmp.path(), "pa", Arc::new(DoneFlag::default())).await;
        let b_mgr = manager(tmp.path(), "pb", Arc::new(DoneFlag::default())).await;
        let a_ev = PairCollector::default();
        let b_ev = PairCollector::default();
        let a = PairingService::new(&tmp.path().join("id-a"), a_mgr, fp.clone(), mailbox.clone(), Arc::new(a_ev.clone())).unwrap();
        let b = Arc::new(PairingService::new(&tmp.path().join("id-b"), b_mgr, fp.clone(), mailbox.clone(), Arc::new(b_ev.clone())).unwrap());

        let a_fp = PublicKey::decode(&a.identity()).unwrap().fingerprint();
        let b_fp = PublicKey::decode(&b.identity()).unwrap().fingerprint();

        // A shows a code; B redeems it (typed). Redeem blocks until A confirms,
        // so it runs in a task while the test drives A's side.
        let code = a.show_pair_code().unwrap();
        let b2 = b.clone();
        let redeem = tokio::spawn(async move { b2.redeem_pair_code(&code, "code").await });

        // A raises a confirm request for B and does not trust it yet.
        wait_until(Duration::from_secs(10), || {
            a_ev.tags().iter().any(|t| t == &format!("request:{b_fp}"))
        })
        .await;
        assert!(!a.trusted_devices().iter().any(|d| d.fingerprint() == b_fp), "A must not trust B before confirm");

        // A confirms with a chosen name → trust becomes mutual.
        a.confirm_pair(&b_fp, "my-phone").unwrap();
        redeem.await.unwrap().expect("redeem completes");

        let a_view = a.trusted_devices().into_iter().find(|d| d.fingerprint() == b_fp);
        assert_eq!(a_view.map(|d| d.label()), Some("my-phone".to_string()), "A trusts B under the chosen name");
        assert!(b.trusted_devices().iter().any(|d| d.fingerprint() == a_fp), "B trusts A");
        assert!(a_ev.tags().iter().any(|t| t.starts_with("paired")), "A emits paired");
        assert!(b_ev.tags().iter().any(|t| t.starts_with("paired")), "B emits paired");

        // Decline path: a fresh request can be dropped, and the redeemer is told.
        let code2 = a.show_pair_code().unwrap();
        let b3 = b.clone();
        let redeem2 = tokio::spawn(async move { b3.redeem_pair_code(&code2, "code").await });
        wait_until(Duration::from_secs(10), || a.pending_confirms.lock().unwrap().contains_key(&b_fp)).await;
        a.dismiss_pair(&b_fp);
        assert!(redeem2.await.unwrap().is_err(), "redeemer learns it was declined");
    }

    async fn wait_until<F: Fn() -> bool>(timeout: Duration, cond: F) {
        let steps = timeout.as_millis() / 25;
        for _ in 0..steps {
            if cond() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
        panic!("condition not met within {timeout:?}");
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
}
