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

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;

use crate::pairing::broker::{connect, FpClient, Incoming};
use crate::pairing::identity::{Identity, PublicKey};
use crate::pairing::link::{PairLink, PairPayload};
use crate::pairing::offer::{Offer, VerifyError};
use crate::pairing::sas::sas;
use crate::pairing::signal::Signal;
use crate::pairing::trust::{TrustStore, TrustedDevice};
use crate::rendezvous::{client, pake};
use crate::transport::Manager;

/// How long an initiator waits in the mailbox for someone to open its pairing
/// link before the link expires.
const PAIR_TIMEOUT: Duration = Duration::from_secs(120);

/// What the service tells the UI. Translated to frontend events by the caller.
pub enum PairingEvent {
    /// A verified incoming offer awaits the user's accept/decline.
    Offer { transfer_id: String, from_name: String, file_count: u64, total_bytes: u64 },
    /// The peer accepted our offer (its side is now fetching).
    Accepted,
    /// The peer declined our offer.
    Declined,
    /// A one-sided pairing completed; `name` is the newly trusted device.
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
    trust: Arc<TrustStore>,
    manager: Manager,
    broker: FpClient,
    /// Broker mailbox URL (`…/ws`) used for the one-sided pairing exchange. The
    /// fingerprint-routing URL (`…/fp`) for offers is derived from it.
    mailbox_url: String,
    emit: Arc<dyn PairingEmitter>,
    /// Verified incoming offers keyed by transfer id, awaiting accept/decline.
    pending: Arc<Mutex<HashMap<String, Offer>>>,
}

impl PairingService {
    /// Load (or create) the identity + trust store under `dir`, connect to the
    /// broker's fingerprint mode, and start handling incoming signals.
    /// `mailbox_url` is the broker's `…/ws` URL; the `…/fp` routing URL is
    /// derived from it. Must be called from within a Tokio runtime.
    pub fn new(
        dir: &Path,
        manager: Manager,
        mailbox_url: String,
        emit: Arc<dyn PairingEmitter>,
    ) -> Result<PairingService, String> {
        let identity = Arc::new(Identity::load_or_create(dir)?);
        let trust = Arc::new(TrustStore::load(dir)?);
        let fp_url = mailbox_url
            .strip_suffix("/ws")
            .map_or_else(|| format!("{mailbox_url}/fp"), |base| format!("{base}/fp"));
        let (broker, incoming) = connect(fp_url, &identity);

        let svc = PairingService {
            identity,
            trust: trust.clone(),
            manager: manager.clone(),
            broker: broker.clone(),
            mailbox_url,
            emit: emit.clone(),
            pending: Arc::new(Mutex::new(HashMap::new())),
        };

        // Background loop: verify and dispatch every incoming signal.
        tokio::spawn(incoming_loop(incoming, trust, manager, emit, svc.pending.clone()));
        Ok(svc)
    }

    /// A default device name for pairing, derived from the fingerprint. Users
    /// rename in the Devices list.
    fn default_name(&self) -> String {
        format!("device-{}", &self.identity.fingerprint()[..8])
    }

    /// Create a one-sided pairing link to show (as text/QR) on this device. When
    /// another device opens it, both end up trusting each other. Spawns a waiter
    /// that trusts whoever completes the exchange (or expires after a timeout).
    pub fn create_pair_link(&self) -> Result<String, String> {
        let mut room = [0u8; 8];
        let mut secret = [0u8; 16];
        getrandom::fill(&mut room).map_err(|e| format!("rng: {e}"))?;
        getrandom::fill(&mut secret).map_err(|e| format!("rng: {e}"))?;
        let room = hex::encode(room);
        let secret = B64.encode(secret);

        let link = PairLink {
            v: 1,
            room: room.clone(),
            secret: secret.clone(),
            id: self.identity.public().encode(),
            name: self.default_name(),
        };

        let mailbox_url = self.mailbox_url.clone();
        let trust = self.trust.clone();
        let emit = self.emit.clone();
        tokio::spawn(async move {
            let result = tokio::time::timeout(
                PAIR_TIMEOUT,
                pair_await(&mailbox_url, &room, &secret, &trust),
            )
            .await;
            match result {
                Ok(Ok(name)) => emit.emit(PairingEvent::Paired { name }),
                Ok(Err(e)) => {
                    tracing::warn!(error = %e, "pairing link: exchange failed");
                    emit.emit(PairingEvent::Error { message: "Pairing failed. Try a new link.".into() });
                }
                Err(_) => emit.emit(PairingEvent::Error {
                    message: "The pairing link expired. Create a new one.".into(),
                }),
            }
        });

        Ok(link.encode())
    }

    /// Open a pairing link from another device: trust the initiator immediately
    /// (the link is the authenticated out-of-band channel) and send this
    /// device's signed identity back so the initiator trusts it too.
    pub async fn open_pair_link(&self, link: &str) -> Result<(), String> {
        let link = PairLink::decode(link)?;
        let initiator = PublicKey::decode(&link.id)?;
        // Trust the initiator now; the exchange below makes it mutual.
        self.trust.add(initiator, &link.name)?;

        let mut mailbox = client::join(&self.mailbox_url, &link.room).await?;
        let (handshake, my_msg) = pake::start(&link.secret, &link.room);
        mailbox.send(&my_msg).await?;
        let peer_msg = mailbox.recv().await?;
        let key = handshake.finish(&peer_msg)?;
        let payload = serde_json::to_vec(&PairPayload {
            id: self.identity.public().encode(),
            name: self.default_name(),
        })
        .map_err(|e| e.to_string())?;
        let sealed = pake::seal(&key, &payload)?;
        mailbox.send(&sealed).await?;

        self.emit.emit(PairingEvent::Paired { name: link.name });
        Ok(())
    }

    /// This device's encoded public identity (QR / copy).
    pub fn identity(&self) -> String {
        self.identity.public().encode()
    }

    pub fn trusted_devices(&self) -> Vec<TrustedDevice> {
        self.trust.list()
    }

    /// Decode a pasted identity and return (fingerprint, SAS, name) for the
    /// compare-and-confirm step. The SAS is derived from the ECDH shared secret,
    /// so both devices see the same digits.
    pub fn preview(&self, encoded: &str) -> Result<(String, String, String), String> {
        let pk = crate::pairing::identity::PublicKey::decode(encoded)?;
        let secret = self.identity.shared_secret(&pk)?;
        Ok((pk.fingerprint(), sas(&secret), String::new()))
    }

    pub fn trust(&self, encoded: &str, name: &str) -> Result<(), String> {
        let pk = crate::pairing::identity::PublicKey::decode(encoded)?;
        self.trust.add(pk, name)
    }

    pub fn untrust(&self, fingerprint: &str) -> Result<(), String> {
        self.trust.remove(fingerprint)
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
        let offer = self.identity.sign_offer(&id, ts, file_count, total_bytes, &ticket);
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

async fn incoming_loop(
    mut incoming: tokio::sync::mpsc::UnboundedReceiver<Incoming>,
    trust: Arc<TrustStore>,
    manager: Manager,
    emit: Arc<dyn PairingEmitter>,
    pending: Arc<Mutex<HashMap<String, Offer>>>,
) {
    while let Some(msg) = incoming.recv().await {
        match msg {
            Incoming::Signal(Signal::Offer(offer)) => match offer.verify(&trust) {
                Ok(()) => {
                    let from_name = trust
                        .get(&offer.from.fingerprint())
                        .map(|d| d.name)
                        .unwrap_or_default();
                    let ev = PairingEvent::Offer {
                        transfer_id: offer.transfer_id.clone(),
                        from_name,
                        file_count: offer.file_count,
                        total_bytes: offer.total_bytes,
                    };
                    pending.lock().unwrap().insert(offer.transfer_id.clone(), offer);
                    emit.emit(ev);
                }
                Err(VerifyError::Untrusted) => tracing::warn!("pairing: offer from untrusted device"),
                Err(VerifyError::BadSignature) => tracing::warn!("pairing: offer with bad signature"),
            },
            Incoming::Signal(Signal::Response(resp)) => {
                if resp.verify(&trust).is_ok() {
                    if resp.accept {
                        emit.emit(PairingEvent::Accepted);
                    } else {
                        emit.emit(PairingEvent::Declined);
                        manager.cancel(crate::transport::Kind::Send);
                    }
                }
            }
            Incoming::Unreachable(fp) => {
                tracing::info!(fp = %fp, "pairing: target offline");
                emit.emit(PairingEvent::Error { message: "The device is offline.".into() });
            }
        }
    }
}

/// Initiator side of a one-sided pairing: wait in the mailbox for the opener,
/// run SPAKE2 over the link secret, receive and trust the opener's identity.
/// Returns the newly trusted device's name.
async fn pair_await(
    mailbox_url: &str,
    room: &str,
    secret: &str,
    trust: &TrustStore,
) -> Result<String, String> {
    let mut mailbox = client::join(mailbox_url, room).await?;
    let (handshake, my_msg) = pake::start(secret, room);
    mailbox.send(&my_msg).await?;
    let peer_msg = mailbox.recv().await?;
    let key = handshake.finish(&peer_msg)?;
    let sealed = mailbox.recv().await?;
    let payload = pake::open(&key, &sealed)?;
    let payload: PairPayload =
        serde_json::from_slice(&payload).map_err(|e| format!("bad pairing payload: {e}"))?;
    let peer = PublicKey::decode(&payload.id)?;
    trust.add(peer, &payload.name)?;
    Ok(payload.name)
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
        let a = PairingService::new(&dir_a, a_mgr, broker.clone(), Arc::new(a_events.clone())).unwrap();
        let b = PairingService::new(&dir_b, b_mgr, broker.clone(), Arc::new(b_events.clone())).unwrap();

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
        let Ok(broker) = std::env::var("FLOPPY_TEST_BROKER") else { return };
        let tmp = tempfile::tempdir().unwrap();
        let payload = vec![9u8; 250_000];
        let src = write_file(tmp.path(), "live-trusted.bin", &payload);

        let a_mgr = manager(tmp.path(), "la", Arc::new(DoneFlag::default())).await;
        let b_done = DoneFlag::default();
        let b_mgr = manager(tmp.path(), "lb", Arc::new(b_done.clone())).await;
        let a_events = PairCollector::default();
        let b_events = PairCollector::default();
        let a = PairingService::new(&tmp.path().join("lid-a"), a_mgr, broker.clone(), Arc::new(a_events.clone())).unwrap();
        let b = PairingService::new(&tmp.path().join("lid-b"), b_mgr, broker.clone(), Arc::new(b_events.clone())).unwrap();
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

    /// In-process mailbox broker (the `/ws` mode) for the one-sided pairing
    /// exchange: pairs two parties by room, buffering the first's frames.
    async fn spawn_mock_mailbox() -> String {
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
        }
        #[derive(Default)]
        struct Room {
            parties: Vec<(u64, mpsc::UnboundedSender<Message>)>,
            buffered: Vec<Message>,
        }

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let rooms: Arc<AsyncMutex<HashMap<String, Room>>> = Arc::new(AsyncMutex::new(HashMap::new()));
        static IDS: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let rooms = rooms.clone();
                tokio::spawn(async move {
                    let Ok(ws) = tokio_tungstenite::accept_async(stream).await else { return };
                    let (mut write, mut read) = ws.split();
                    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
                    tokio::spawn(async move {
                        while let Some(m) = rx.recv().await {
                            if write.send(m).await.is_err() {
                                break;
                            }
                        }
                    });
                    // First frame must be a mailbox join (fp registers land here
                    // too and are dropped — harmless).
                    let room_id = match futures_util::StreamExt::next(&mut read).await {
                        Some(Ok(Message::Text(t))) => match serde_json::from_str::<In>(&t) {
                            Ok(m) if m.typ == "join" => m.room.unwrap_or_default(),
                            _ => return,
                        },
                        _ => return,
                    };
                    let my_id = IDS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
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
                    if let Some(rm) = rooms.lock().await.get_mut(&room_id) {
                        rm.parties.retain(|(id, _)| *id != my_id);
                    }
                });
            }
        });
        format!("ws://{addr}/ws")
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn one_sided_pairing_makes_trust_mutual() {
        let tmp = tempfile::tempdir().unwrap();
        let mailbox = spawn_mock_mailbox().await;

        let a_mgr = manager(tmp.path(), "pa", Arc::new(DoneFlag::default())).await;
        let b_mgr = manager(tmp.path(), "pb", Arc::new(DoneFlag::default())).await;
        let a_ev = PairCollector::default();
        let b_ev = PairCollector::default();
        let a = PairingService::new(&tmp.path().join("id-a"), a_mgr, mailbox.clone(), Arc::new(a_ev.clone())).unwrap();
        let b = PairingService::new(&tmp.path().join("id-b"), b_mgr, mailbox.clone(), Arc::new(b_ev.clone())).unwrap();

        // A shows a link; B opens it. One action → mutual trust.
        let link = a.create_pair_link().unwrap();
        b.open_pair_link(&link).await.unwrap();

        // A completes the exchange and trusts B.
        wait_until(Duration::from_secs(10), || {
            a_ev.tags().iter().any(|t| t.starts_with("paired"))
        })
        .await;

        let a_fp = PublicKey::decode(&a.identity()).unwrap().fingerprint();
        let b_fp = PublicKey::decode(&b.identity()).unwrap().fingerprint();
        assert!(a.trusted_devices().iter().any(|d| d.fingerprint() == b_fp), "A should trust B");
        assert!(b.trusted_devices().iter().any(|d| d.fingerprint() == a_fp), "B should trust A");
        assert!(b_ev.tags().iter().any(|t| t.starts_with("paired")), "B emits paired");
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
