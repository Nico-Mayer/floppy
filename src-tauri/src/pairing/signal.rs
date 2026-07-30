// The application-level message two paired devices exchange over the broker's
// fingerprint mode. The broker relays it as an opaque blob; only the endpoints
// understand it. An offer flows sender→receiver; a response flows back. (The
// old croc "ready" step is gone — with iroh the sender serves immediately, so
// the receiver fetches the offer's ticket as soon as it accepts.)

use serde::{Deserialize, Serialize};

use crate::pairing::link::{PairInit, PairResp, PairSeal};
use crate::pairing::offer::{Offer, Response};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Signal {
    Offer(Offer),
    Response(Response),
    /// Opener → initiator: "I opened your link" + SPAKE2 message (one-sided
    /// pairing, run over this same fp channel instead of a separate mailbox).
    PairInit(PairInit),
    /// Initiator → opener: the initiator's SPAKE2 reply.
    PairResp(PairResp),
    /// Opener → initiator: the opener's identity, sealed under the PAKE key.
    PairSeal(PairSeal),
}

impl Signal {
    pub fn encode(&self) -> Vec<u8> {
        serde_json::to_vec(self).expect("serialize signal")
    }

    pub fn decode(blob: &[u8]) -> Result<Signal, String> {
        serde_json::from_slice(blob).map_err(|e| format!("decoding signal: {e}"))
    }
}
