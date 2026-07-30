// Fingerprint-mode broker client for trusted devices. Registers under this
// device's fingerprint and stays connected, relaying signed signal blobs to and
// from other devices by fingerprint. A single background task owns the
// connection (so writes never race), reconnecting with backoff so a device that
// sat idle can still send.

use std::time::Duration;

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

use crate::pairing::identity::Identity;
use crate::pairing::signal::Signal;

/// Something that arrived from the broker for this device.
pub enum Incoming {
    /// A signal relayed from a peer.
    Signal(Signal),
    /// The peer with this fingerprint was offline when we tried to reach it.
    Unreachable(String),
}

/// A queued outbound signal: (target fingerprint, opaque blob).
type Outbound = (String, Vec<u8>);

/// Handle for sending signals. Cloneable; drop all clones to stop the client.
#[derive(Clone)]
pub struct FpClient {
    out: mpsc::UnboundedSender<Outbound>,
}

impl FpClient {
    /// Relay `signal` to the device with fingerprint `to`.
    pub fn send(&self, to: &str, signal: &Signal) {
        let _ = self.out.send((to.to_string(), signal.encode()));
    }
}

#[derive(Serialize, Deserialize)]
struct Wire {
    #[serde(rename = "type")]
    typ: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    key: Option<String>, // register: base64url(sign‖kex)
    #[serde(skip_serializing_if = "Option::is_none")]
    sig: Option<String>, // register proof, base64
    #[serde(skip_serializing_if = "Option::is_none")]
    to: Option<String>, // signal target fingerprint
    #[serde(skip_serializing_if = "Option::is_none")]
    blob: Option<String>, // opaque signal, base64
}

/// Connect and register in the background. Returns a send handle and the stream
/// of incoming signals. Connection failures are retried transparently; the
/// first attempt does not block the caller.
pub fn connect(url: String, identity: &Identity) -> (FpClient, mpsc::UnboundedReceiver<Incoming>) {
    let encoded_key = identity.public().encode();
    let reg_sig = B64.encode(identity.sign_register());
    let (out_tx, out_rx) = mpsc::unbounded_channel::<Outbound>();
    let (in_tx, in_rx) = mpsc::unbounded_channel::<Incoming>();
    tokio::spawn(run(url, encoded_key, reg_sig, out_rx, in_tx));
    (FpClient { out: out_tx }, in_rx)
}

/// Owns the connection for the client's life: (re)connect, register, then relay
/// between the ws and the in/out channels until the socket dies, and repeat.
async fn run(
    url: String,
    key: String,
    sig: String,
    mut out_rx: mpsc::UnboundedReceiver<Outbound>,
    in_tx: mpsc::UnboundedSender<Incoming>,
) {
    let mut backoff = Duration::from_secs(1);
    loop {
        match serve_once(&url, &key, &sig, &mut out_rx, &in_tx).await {
            // Clean stop: the send handle was dropped or the consumer went away.
            Ok(()) => return,
            Err(e) => tracing::debug!(error = %e, "pairing broker: disconnected, retrying"),
        }
        // If the consumer is gone there is no point reconnecting.
        if in_tx.is_closed() {
            return;
        }
        tokio::time::sleep(backoff).await;
        backoff = (backoff * 2).min(Duration::from_secs(30));
    }
}

async fn serve_once(
    url: &str,
    key: &str,
    sig: &str,
    out_rx: &mut mpsc::UnboundedReceiver<Outbound>,
    in_tx: &mpsc::UnboundedSender<Incoming>,
) -> Result<(), String> {
    let (ws, _) = connect_async(url).await.map_err(|e| format!("connect: {e}"))?;
    let (mut write, mut read) = ws.split();

    // Register and await the ok.
    let reg = Wire { typ: "register".into(), key: Some(key.into()), sig: Some(sig.into()), to: None, blob: None };
    write.send(json(&reg)).await.map_err(|e| format!("register: {e}"))?;
    match read.next().await {
        Some(Ok(Message::Text(t))) => {
            let ack: Wire = serde_json::from_str(&t).map_err(|e| format!("ack: {e}"))?;
            if ack.typ != "ok" {
                return Err(format!("registration refused ({})", ack.typ));
            }
        }
        other => return Err(format!("no register ack: {other:?}")),
    }
    tracing::info!("pairing broker: registered");

    loop {
        tokio::select! {
            // Outbound signal to relay.
            queued = out_rx.recv() => {
                let Some((to, blob)) = queued else { return Ok(()) }; // handle dropped
                let m = Wire { typ: "signal".into(), key: None, sig: None, to: Some(to), blob: Some(B64.encode(blob)) };
                write.send(json(&m)).await.map_err(|e| format!("send: {e}"))?;
            }
            // Inbound frame from the broker.
            frame = read.next() => {
                let text = match frame {
                    Some(Ok(Message::Text(t))) => t.to_string(),
                    Some(Ok(Message::Close(_))) | None => return Err("closed".into()),
                    Some(Err(e)) => return Err(format!("read: {e}")),
                    _ => continue,
                };
                let w: Wire = serde_json::from_str(&text).map_err(|e| format!("decode: {e}"))?;
                let incoming = match w.typ.as_str() {
                    "signal" => {
                        let blob = w.blob.and_then(|b| B64.decode(b).ok()).ok_or("signal missing blob")?;
                        match Signal::decode(&blob) {
                            Ok(sig) => Incoming::Signal(sig),
                            Err(_) => continue, // undecodable — drop, stay connected
                        }
                    }
                    "unreachable" => Incoming::Unreachable(w.to.unwrap_or_default()),
                    _ => continue,
                };
                if in_tx.send(incoming).is_err() {
                    return Ok(()); // consumer gone
                }
            }
        }
    }
}

fn json(m: &Wire) -> Message {
    Message::text(serde_json::to_string(m).expect("serialize fp wire"))
}
