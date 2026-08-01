// WebSocket client for the broker's code-mailbox mode. Joins a room and
// exchanges opaque handshake blobs with the one peer in that room. The wire is
// the Go broker's: JSON `{type, room, data}` where `data` is standard base64
// (Go's `encoding/json` base64-encodes `[]byte`; we match).

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};

#[derive(Serialize, Deserialize)]
struct Wire {
    #[serde(rename = "type")]
    typ: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    room: Option<String>,
    /// Opaque handshake bytes, base64. `None` on control frames.
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<String>,
}

/// A joined mailbox: send/recv opaque blobs with the room's other party.
pub struct Mailbox {
    ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
}

/// Connect to the broker (`ws://…/ws` or `wss://…/ws`) and join `room`.
pub async fn join(url: &str, room: &str) -> Result<Mailbox, String> {
    let (mut ws, _) = connect_async(url).await.map_err(|e| format!("broker connect: {e}"))?;
    let join = Wire { typ: "join".into(), room: Some(room.into()), data: None };
    ws.send(text(&join)).await.map_err(|e| format!("broker join: {e}"))?;
    Ok(Mailbox { ws })
}

impl Mailbox {
    /// Relay one opaque blob to the peer.
    pub async fn send(&mut self, blob: &[u8]) -> Result<(), String> {
        let m = Wire { typ: "msg".into(), room: None, data: Some(B64.encode(blob)) };
        self.ws.send(text(&m)).await.map_err(|e| format!("broker send: {e}"))
    }

    /// Wait for the next opaque blob from the peer. Errors if the room is full
    /// or the connection ends before one arrives.
    pub async fn recv(&mut self) -> Result<Vec<u8>, String> {
        while let Some(msg) = self.ws.next().await {
            let msg = msg.map_err(|e| format!("broker recv: {e}"))?;
            let text = match msg {
                Message::Text(t) => t.to_string(),
                Message::Close(_) => return Err("broker connection closed".into()),
                _ => continue, // binary/ping/pong — not part of this protocol
            };
            let w: Wire = serde_json::from_str(&text).map_err(|e| format!("broker decode: {e}"))?;
            match w.typ.as_str() {
                "msg" => {
                    let data = w.data.ok_or("broker message missing data")?;
                    return B64.decode(data).map_err(|e| format!("broker base64: {e}"));
                }
                "full" => return Err("that code is already in use".into()),
                _ => continue,
            }
        }
        Err("broker connection ended".into())
    }
}

fn text(m: &Wire) -> Message {
    // Serialization of this fixed struct cannot fail.
    Message::text(serde_json::to_string(m).expect("serialize wire msg"))
}
