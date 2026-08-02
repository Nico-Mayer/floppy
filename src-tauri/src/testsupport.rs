//! Shared `#[cfg(test)]` helpers for the transport and pairing suites: one
//! faithful in-process mock of the Go broker (both the `/ws` code-mailbox and
//! the `/fp` fingerprint router), plus the filesystem and `Manager` builders
//! both suites need. Keeping a single mock here means there is one thing to keep
//! in step with `broker/`, instead of a copy per test module that can silently
//! drift (the broker itself is covered by its own Go tests).

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use crate::transport::{Config, Emitter, Manager, RelayConfig};

/// A broker URL that never resolves — for tests that build a `Manager` but never
/// exercise quick share or pairing, so the field just has to be well-formed.
pub const DUMMY_BROKER: &str = "ws://127.0.0.1:1/ws";

/// Build a hermetic `Manager`: relay disabled, loopback bind, on-disk store and
/// dest under `dir`, and a long send TTL so tests that don't exercise expiry are
/// never surprised by it. `broker_url` is `DUMMY_BROKER` unless the test drives
/// quick share or pairing.
pub async fn test_manager(
    dir: &Path,
    name: &str,
    broker_url: &str,
    emit: Arc<dyn Emitter>,
) -> Manager {
    Manager::new(
        Config {
            store_path: Some(dir.join(name)),
            dest_root: dir.join(format!("{name}-dl")),
            relay: RelayConfig::DisableRelay,
            bind_addr: Some("127.0.0.1:0".into()),
            broker_url: broker_url.to_string(),
            send_ttl: Duration::from_secs(300),
        },
        emit,
    )
    .await
    .unwrap()
}

/// Write `bytes` to `dir/name` and return the path.
pub fn write_file(dir: &Path, name: &str, bytes: &[u8]) -> PathBuf {
    use std::io::Write as _;
    let p = dir.join(name);
    std::fs::File::create(&p).unwrap().write_all(bytes).unwrap();
    p
}

/// Every file under `dir`, recursively.
pub fn walk(dir: &Path) -> Vec<PathBuf> {
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

/// In-process stand-in for the Go broker's code-mailbox mode (`broker/mailbox.go`):
/// join a room, pair up to two clients in it, and relay `msg` blobs between them.
/// Caps a room at two parties and replies `{"type":"full"}` to a third join, and
/// buffers a party's blobs until the peer arrives so SPAKE2's first message is
/// not lost to a connect race — the same behavior `rendezvous/client.rs` expects.
/// Returns the `ws://…/ws` URL.
pub async fn mock_mailbox_broker() -> String {
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

                // Relay each message to the other party, or buffer it if the peer
                // has not joined yet.
                while let Some(Ok(Message::Text(t))) =
                    futures_util::StreamExt::next(&mut read).await
                {
                    let m: In = serde_json::from_str(&t).unwrap_or(In {
                        typ: String::new(),
                        room: None,
                        data: None,
                    });
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

/// In-process stand-in for the Go broker's fingerprint mode (`broker/fproute.go`):
/// register by the fingerprint derived from the encoded key, then relay signal
/// blobs to the target fingerprint. Returns the `ws://…/fp` URL.
pub async fn mock_fp_broker() -> String {
    use crate::pairing::identity::PublicKey;
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
