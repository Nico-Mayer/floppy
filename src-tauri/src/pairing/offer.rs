// Signed transfer offers and responses. Ported from the Go `pairing` offer +
// signal, with one change for iroh: the offer carries the sender's iroh ticket
// (which embeds the NodeId) instead of relying on a croc code derived from the
// shared secret. Signing the ticket binds the NodeId — a rendezvous cannot swap
// in a different node without a valid signature, and the receiver dials only
// the ticket from a verified offer.

use serde::{Deserialize, Serialize};

use crate::pairing::identity::{verify, Identity, PublicKey};
use crate::pairing::trust::TrustStore;

/// Why an offer/response failed to verify. The variant (not text) is the
/// contract: `Untrusted` may prompt a pairing, `BadSignature` is dropped.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VerifyError {
    /// The sender is not in the trust store.
    Untrusted,
    /// The signature does not verify (forged, or any field tampered — the
    /// ticket/NodeId included).
    BadSignature,
}

/// A signed request to send files to a trusted device. Carries no file
/// contents — only metadata and the iroh ticket the receiver fetches from once
/// it accepts. The receiver verifies `from` against its trust store and the
/// signature before showing anything to the user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Offer {
    pub from: PublicKey,
    pub transfer_id: String,
    pub ts: i64,
    pub file_count: u64,
    pub total_bytes: u64,
    /// The sender's iroh ticket (node addr + NodeId + content hash). Signed, so
    /// it cannot be substituted.
    pub ticket: String,
    pub sig: Vec<u8>,
}

/// The receiver's signed answer to an offer, authenticated the same way — the
/// sender checks trust + signature before acting on `accept`, so a third party
/// cannot spoof an acceptance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub from: PublicKey,
    pub transfer_id: String,
    pub accept: bool,
    pub sig: Vec<u8>,
}

impl Identity {
    /// Build and sign an offer. `ts` is passed in (not read from the clock) so
    /// the caller owns time and tests stay deterministic.
    pub fn sign_offer(
        &self,
        transfer_id: &str,
        ts: i64,
        file_count: u64,
        total_bytes: u64,
        ticket: &str,
    ) -> Offer {
        let mut o = Offer {
            from: self.public(),
            transfer_id: transfer_id.to_string(),
            ts,
            file_count,
            total_bytes,
            ticket: ticket.to_string(),
            sig: Vec::new(),
        };
        o.sig = self.sign(&o.signing_bytes());
        o
    }

    /// Build and sign a response.
    pub fn sign_response(&self, transfer_id: &str, accept: bool) -> Response {
        let mut r = Response {
            from: self.public(),
            transfer_id: transfer_id.to_string(),
            accept,
            sig: Vec::new(),
        };
        r.sig = self.sign(&r.signing_bytes());
        r
    }
}

impl Offer {
    /// Verify trust + signature. `Untrusted` if the sender is unknown,
    /// `BadSignature` if any field was altered after signing.
    pub fn verify(&self, trust: &TrustStore) -> Result<(), VerifyError> {
        if !trust.trusted(&self.from) {
            return Err(VerifyError::Untrusted);
        }
        if verify(&self.from, &self.signing_bytes(), &self.sig) {
            Ok(())
        } else {
            Err(VerifyError::BadSignature)
        }
    }

    /// The canonical bytes the signature covers: every field except `sig`,
    /// length-prefixed so no two distinct offers encode to the same bytes.
    fn signing_bytes(&self) -> Vec<u8> {
        let mut b = Vec::new();
        append_bytes(&mut b, &self.from.sign);
        append_bytes(&mut b, &self.from.kex);
        append_bytes(&mut b, self.transfer_id.as_bytes());
        append_bytes(&mut b, self.ticket.as_bytes());
        b.extend_from_slice(&(self.ts as u64).to_be_bytes());
        b.extend_from_slice(&self.file_count.to_be_bytes());
        b.extend_from_slice(&self.total_bytes.to_be_bytes());
        b
    }
}

impl Response {
    pub fn verify(&self, trust: &TrustStore) -> Result<(), VerifyError> {
        if !trust.trusted(&self.from) {
            return Err(VerifyError::Untrusted);
        }
        if verify(&self.from, &self.signing_bytes(), &self.sig) {
            Ok(())
        } else {
            Err(VerifyError::BadSignature)
        }
    }

    fn signing_bytes(&self) -> Vec<u8> {
        let mut b = Vec::new();
        append_bytes(&mut b, &self.from.sign);
        append_bytes(&mut b, &self.from.kex);
        append_bytes(&mut b, self.transfer_id.as_bytes());
        b.push(self.accept as u8);
        b
    }
}

/// Length-prefixed append (u32 BE length + bytes), matching the Go signing
/// encoding so the scheme is unambiguous and deterministic.
fn append_bytes(b: &mut Vec<u8>, p: &[u8]) {
    b.extend_from_slice(&(p.len() as u32).to_be_bytes());
    b.extend_from_slice(p);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ident() -> Identity {
        Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap()
    }

    #[test]
    fn trusted_intact_offer_verifies() {
        let sender = ident();
        let trust = TrustStore::in_memory();
        trust.add(sender.public(), "sender").unwrap();
        let offer = sender.sign_offer("t1", 123, 3, 900, "blob-ticket-with-nodeid");
        assert_eq!(offer.verify(&trust), Ok(()));
    }

    #[test]
    fn untrusted_sender_rejected() {
        let sender = ident();
        let empty = TrustStore::in_memory();
        let offer = sender.sign_offer("t1", 123, 1, 10, "ticket");
        assert_eq!(offer.verify(&empty), Err(VerifyError::Untrusted));
    }

    #[test]
    fn tampered_ticket_is_bad_signature() {
        let sender = ident();
        let trust = TrustStore::in_memory();
        trust.add(sender.public(), "sender").unwrap();
        let mut offer = sender.sign_offer("t1", 123, 1, 10, "real-node-ticket");
        // A rendezvous swaps in its own node's ticket, keeping the signature.
        offer.ticket = "attacker-node-ticket".into();
        assert_eq!(offer.verify(&trust), Err(VerifyError::BadSignature));
    }

    #[test]
    fn substituted_node_without_signature_rejected() {
        // An offer forged by a party that is trusted-looking but re-signs with a
        // different key is caught: the `from` is untrusted, or if `from` is left
        // as the real sender the signature fails.
        let sender = ident();
        let attacker = ident();
        let trust = TrustStore::in_memory();
        trust.add(sender.public(), "sender").unwrap();
        // Attacker signs its own offer but claims to be the trusted sender by
        // copying `from` — the signature no longer matches that key.
        let mut forged = attacker.sign_offer("t1", 1, 1, 1, "attacker-ticket");
        forged.from = sender.public();
        assert_eq!(forged.verify(&trust), Err(VerifyError::BadSignature));
    }

    #[test]
    fn response_round_trip_and_spoof_rejected() {
        let receiver = ident();
        let trust = TrustStore::in_memory();
        trust.add(receiver.public(), "receiver").unwrap();
        let ok = receiver.sign_response("t1", true);
        assert_eq!(ok.verify(&trust), Ok(()));

        let stranger = ident();
        let spoof = stranger.sign_response("t1", true);
        assert_eq!(spoof.verify(&trust), Err(VerifyError::Untrusted));
    }
}
