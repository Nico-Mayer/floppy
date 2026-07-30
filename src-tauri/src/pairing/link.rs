// One-sided pairing links. The initiator shows a link (QR/copy); the other
// device opens it and both end up trusting each other in a single action —
// removing the confusing "add on both sides" step.
//
// The link carries the initiator's PUBLIC identity, a random mailbox room, and
// a random secret. It is the authenticated out-of-band channel (scanned/shared
// in person), exactly like a consumer device-linking QR: whoever holds the link
// is authorized to pair. The secret is a PAKE password, so the broker relaying
// the identity exchange never learns it and cannot substitute an identity.

use base64::engine::general_purpose::URL_SAFE_NO_PAD as B64URL;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Scheme prefix so a pasted link is recognizable and a deep link can carry it.
const PREFIX: &str = "floppy://pair/";

/// The contents of a pairing link.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairLink {
    pub v: u8,
    /// Mailbox room for the identity exchange (opaque to the broker).
    pub room: String,
    /// PAKE secret (base64), used as the SPAKE2 password.
    pub secret: String,
    /// The initiator's encoded public identity (the other side trusts this).
    pub id: String,
    /// The initiator's device name.
    pub name: String,
}

impl PairLink {
    /// Render as the shareable `floppy://pair/<base64url(json)>` string.
    pub fn encode(&self) -> String {
        let json = serde_json::to_vec(self).expect("serialize pair link");
        format!("{PREFIX}{}", B64URL.encode(json))
    }

    /// Parse a link, tolerating a present-or-absent scheme prefix and surrounding
    /// whitespace.
    pub fn decode(s: &str) -> Result<PairLink, String> {
        let body = s.trim().strip_prefix(PREFIX).unwrap_or(s.trim());
        let json = B64URL.decode(body).map_err(|e| format!("bad pair link: {e}"))?;
        let link: PairLink =
            serde_json::from_slice(&json).map_err(|e| format!("bad pair link: {e}"))?;
        if link.v != 1 {
            return Err(format!("unsupported pair link version {}", link.v));
        }
        Ok(link)
    }
}

/// The payload the opener sends back to the initiator, sealed under the PAKE
/// key: its identity + name, so the initiator can trust it too.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairPayload {
    pub id: String,
    pub name: String,
}

// The three messages of the one-sided pairing handshake, exchanged as fp
// `Signal`s (routed by fingerprint over the persistent broker connection —
// no separate mailbox socket, so nothing to reap while a link is on screen).
// The SPAKE2 exchange still runs end-to-end: the broker relays these opaque
// blobs and never learns the link secret, so it cannot substitute an identity.

/// Opener → initiator. `from_fp` is the opener's fingerprint so the initiator
/// can route its reply back; `pake` is the opener's SPAKE2 message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairInit {
    pub room: String,
    pub from_fp: String,
    pub pake: Vec<u8>,
}

/// Initiator → opener: the initiator's SPAKE2 message, keyed to `room`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairResp {
    pub room: String,
    pub pake: Vec<u8>,
}

/// Opener → initiator: the opener's `PairPayload`, sealed under the PAKE key.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairSeal {
    pub room: String,
    pub sealed: Vec<u8>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn link_roundtrips_with_and_without_prefix() {
        let link = PairLink {
            v: 1,
            room: "abcd1234".into(),
            secret: "c2VjcmV0".into(),
            id: "encoded-identity".into(),
            name: "device-a".into(),
        };
        let s = link.encode();
        assert!(s.starts_with(PREFIX));
        let back = PairLink::decode(&s).unwrap();
        assert_eq!(back.room, "abcd1234");
        // Also parses the bare base64 (e.g. pasted without the scheme).
        let bare = s.strip_prefix(PREFIX).unwrap();
        assert_eq!(PairLink::decode(bare).unwrap().id, "encoded-identity");
    }
}
