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
use tokio::sync::oneshot;

use crate::pairing::broker::{connect, FpClient, Incoming};
use crate::pairing::identity::{Identity, PublicKey};
use crate::pairing::link::{PairInit, PairLink, PairPayload, PairResp, PairSeal};
use crate::pairing::offer::{Offer, VerifyError};
use crate::pairing::sas::sas;
use crate::pairing::signal::Signal;
use crate::pairing::trust::{TrustStore, TrustedDevice};
use crate::rendezvous::pake;
use crate::transport::Manager;

/// How long a shown pairing link stays valid — the initiator keeps the session
/// this long, then drops it silently (showing a link you never use is not an
/// error). Also bounds how long the opener waits for the initiator's reply.
const PAIR_TIMEOUT: Duration = Duration::from_secs(120);

/// Initiator-side state for one outstanding pairing link, keyed by room. Holds
/// the link secret until an opener arrives, then the PAKE key + opener
/// fingerprint until the sealed identity lands.
struct LinkSession {
    secret: String,
    established: Option<(/* key */ [u8; 32], /* opener_fp */ String)>,
}

/// Shared pairing state, threaded into the incoming-signal loop.
type Links = Arc<Mutex<HashMap<String, LinkSession>>>;
/// Opener-side waiters: room → the channel `open_pair_link` blocks on for the
/// initiator's SPAKE2 reply.
type Waiters = Arc<Mutex<HashMap<String, oneshot::Sender<Vec<u8>>>>>;

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
    emit: Arc<dyn PairingEmitter>,
    /// Verified incoming offers keyed by transfer id, awaiting accept/decline.
    pending: Arc<Mutex<HashMap<String, Offer>>>,
    /// Outstanding pairing links this device is showing.
    links: Links,
    /// Pairing exchanges this device initiated by opening a link.
    waiters: Waiters,
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
        emit: Arc<dyn PairingEmitter>,
    ) -> Result<PairingService, String> {
        let identity = Arc::new(Identity::load_or_create(dir)?);
        let trust = Arc::new(TrustStore::load(dir)?);
        let (broker, incoming) = connect(fp_url, &identity);

        let svc = PairingService {
            identity,
            trust: trust.clone(),
            manager: manager.clone(),
            broker: broker.clone(),
            emit: emit.clone(),
            pending: Arc::new(Mutex::new(HashMap::new())),
            links: Arc::new(Mutex::new(HashMap::new())),
            waiters: Arc::new(Mutex::new(HashMap::new())),
        };

        // Background loop: verify and dispatch every incoming signal.
        tokio::spawn(incoming_loop(Loop {
            incoming,
            trust,
            manager,
            broker,
            emit,
            pending: svc.pending.clone(),
            links: svc.links.clone(),
            waiters: svc.waiters.clone(),
        }));
        Ok(svc)
    }

    /// A default device name for pairing, derived from the fingerprint. Users
    /// rename in the Devices list.
    fn default_name(&self) -> String {
        format!("device-{}", &self.identity.fingerprint()[..8])
    }

    /// Create a one-sided pairing link to show (as text/QR) on this device. When
    /// another device opens it, both end up trusting each other. Registers the
    /// link so the incoming-signal loop can complete the exchange; showing a
    /// link opens no socket and raises no error if it goes unused — it just
    /// expires quietly after `PAIR_TIMEOUT`.
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

        self.links.lock().unwrap().insert(room.clone(), LinkSession { secret, established: None });

        // Expire the session quietly — no error to the UI. A link left on screen
        // and never scanned should just stop working, not toast a failure.
        let links = self.links.clone();
        tokio::spawn(async move {
            tokio::time::sleep(PAIR_TIMEOUT).await;
            links.lock().unwrap().remove(&room);
        });

        Ok(link.encode())
    }

    /// Open a pairing link from another device: trust the initiator immediately
    /// (the link is the authenticated out-of-band channel), then run the SPAKE2
    /// exchange over the fp channel so the initiator trusts this device too. The
    /// initiator's fingerprint comes from the link, and it is already registered
    /// on the broker, so the reply routes straight back — no mailbox socket.
    pub async fn open_pair_link(&self, link: &str) -> Result<(), String> {
        let link = PairLink::decode(link)?;
        let initiator = PublicKey::decode(&link.id)?;
        let initiator_fp = initiator.fingerprint();
        // Trust the initiator now; the exchange below makes it mutual.
        self.trust.add(initiator, &link.name)?;

        let (handshake, my_msg) = pake::start(&link.secret, &link.room);
        let (tx, rx) = oneshot::channel();
        self.waiters.lock().unwrap().insert(link.room.clone(), tx);

        self.broker.send(
            &initiator_fp,
            &Signal::PairInit(PairInit {
                room: link.room.clone(),
                from_fp: self.identity.public().fingerprint(),
                pake: my_msg,
            }),
        );

        // Wait for the initiator's SPAKE2 reply, delivered by the signal loop.
        let peer_msg = match tokio::time::timeout(PAIR_TIMEOUT, rx).await {
            Ok(Ok(msg)) => msg,
            _ => {
                self.waiters.lock().unwrap().remove(&link.room);
                return Err("The other device didn't respond. Make sure it's online and showing the link, then try again.".into());
            }
        };

        let key = handshake.finish(&peer_msg)?;
        let payload = serde_json::to_vec(&PairPayload {
            id: self.identity.public().encode(),
            name: self.default_name(),
        })
        .map_err(|e| e.to_string())?;
        let sealed = pake::seal(&key, &payload)?;
        self.broker.send(&initiator_fp, &Signal::PairSeal(PairSeal { room: link.room, sealed }));

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

/// Everything the incoming-signal loop needs. Bundled because pairing added
/// enough shared state that a positional argument list stopped being readable.
struct Loop {
    incoming: tokio::sync::mpsc::UnboundedReceiver<Incoming>,
    trust: Arc<TrustStore>,
    manager: Manager,
    broker: FpClient,
    emit: Arc<dyn PairingEmitter>,
    pending: Arc<Mutex<HashMap<String, Offer>>>,
    links: Links,
    waiters: Waiters,
}

async fn incoming_loop(mut l: Loop) {
    while let Some(msg) = l.incoming.recv().await {
        match msg {
            Incoming::Signal(Signal::Offer(offer)) => match offer.verify(&l.trust) {
                Ok(()) => {
                    let from_name = l
                        .trust
                        .get(&offer.from.fingerprint())
                        .map(|d| d.name)
                        .unwrap_or_default();
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
            // Initiator side: someone opened our link. Finish our half of the
            // SPAKE2 and reply so they can seal their identity back to us.
            Incoming::Signal(Signal::PairInit(init)) => on_pair_init(&l, init),
            // Opener side: hand the initiator's reply to the waiting call.
            Incoming::Signal(Signal::PairResp(resp)) => {
                if let Some(tx) = l.waiters.lock().unwrap().remove(&resp.room) {
                    let _ = tx.send(resp.pake);
                }
            }
            // Initiator side: open the opener's sealed identity and trust it.
            Incoming::Signal(Signal::PairSeal(seal)) => on_pair_seal(&l, seal),
            Incoming::Unreachable(fp) => {
                tracing::info!(fp = %fp, "pairing: target offline");
                l.emit.emit(PairingEvent::Error { message: "The device is offline.".into() });
            }
        }
    }
}

/// Initiator's response to an opener's `PairInit`: derive the shared key from
/// the link secret, stash it against the seal that follows, and reply.
fn on_pair_init(l: &Loop, init: PairInit) {
    let secret = match l.links.lock().unwrap().get(&init.room) {
        Some(s) => s.secret.clone(),
        None => return, // unknown or expired link — ignore
    };
    let (handshake, my_msg) = pake::start(&secret, &init.room);
    let key = match handshake.finish(&init.pake) {
        Ok(k) => k,
        Err(e) => {
            tracing::warn!(error = %e, "pairing: PAKE finish failed");
            return;
        }
    };
    if let Some(s) = l.links.lock().unwrap().get_mut(&init.room) {
        s.established = Some((key, init.from_fp.clone()));
    }
    l.broker.send(&init.from_fp, &Signal::PairResp(PairResp { room: init.room, pake: my_msg }));
}

/// Initiator's handling of the opener's `PairSeal`: decrypt the identity the
/// opener sealed under the PAKE key, trust it, and report the pairing done.
fn on_pair_seal(l: &Loop, seal: PairSeal) {
    let Some((key, _)) = l.links.lock().unwrap().get(&seal.room).and_then(|s| s.established.clone())
    else {
        return; // no matching pending link
    };
    let name = match open_pair_payload(&key, &seal.sealed, &l.trust) {
        Ok(name) => name,
        Err(e) => {
            tracing::warn!(error = %e, "pairing: could not complete from seal");
            return;
        }
    };
    l.links.lock().unwrap().remove(&seal.room);
    l.emit.emit(PairingEvent::Paired { name });
}

/// Decrypt and trust the identity an opener sealed under the PAKE key. Returns
/// the newly trusted device's name.
fn open_pair_payload(key: &[u8; 32], sealed: &[u8], trust: &TrustStore) -> Result<String, String> {
    let payload = pake::open(key, sealed)?;
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

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn one_sided_pairing_makes_trust_mutual() {
        let tmp = tempfile::tempdir().unwrap();
        // Pairing rides the fp channel now, so both devices share one fp broker.
        let broker = spawn_mock_fp_broker().await;

        let a_mgr = manager(tmp.path(), "pa", Arc::new(DoneFlag::default())).await;
        let b_mgr = manager(tmp.path(), "pb", Arc::new(DoneFlag::default())).await;
        let a_ev = PairCollector::default();
        let b_ev = PairCollector::default();
        let a = PairingService::new(&tmp.path().join("id-a"), a_mgr, broker.clone(), Arc::new(a_ev.clone())).unwrap();
        let b = PairingService::new(&tmp.path().join("id-b"), b_mgr, broker.clone(), Arc::new(b_ev.clone())).unwrap();

        // Let both register with the broker before the exchange routes by fp.
        tokio::time::sleep(Duration::from_millis(200)).await;

        // A shows a link; B opens it. One action → mutual trust.
        let link = a.create_pair_link().unwrap();
        b.open_pair_link(&link).await.unwrap();

        // A completes the exchange (over fp) and trusts B.
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
