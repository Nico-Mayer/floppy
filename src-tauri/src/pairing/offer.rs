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
    /// The sender's current self-name, so the receiver can refresh the label it
    /// shows for this device without a separate exchange.
    pub self_name: String,
    pub transfer_id: String,
    pub ts: i64,
    pub file_count: u64,
    pub total_bytes: u64,
    /// The sender's iroh ticket (node addr + NodeId + content hash). Signed, so
    /// it cannot be substituted.
    pub ticket: String,
    pub sig: Vec<u8>,
}

/// Why an offer was declined. Distinguishes a user's "no" from a device that was
/// busy with another transfer or an unanswered prompt, so the sender can say
/// "they're busy, try again" instead of "they said no". `None` on an accept.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeclineReason {
    /// The user declined.
    Manual,
    /// The device was busy (another transfer, or an offer prompt already open).
    Busy,
}

/// The receiver's signed answer to an offer, authenticated the same way — the
/// sender checks trust + signature before acting on `accept`, so a third party
/// cannot spoof an acceptance. A decline carries a `reason`; an accept sets it
/// to `None`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub from: PublicKey,
    pub transfer_id: String,
    pub accept: bool,
    #[serde(default)]
    pub reason: Option<DeclineReason>,
    pub sig: Vec<u8>,
}

/// The receiver's signed "I have it all" for an accepted transfer, sent after
/// the content is fully received and exported. It is what completes a passive
/// send whose byte counter never reaches the total — a deduped or resumed
/// receive moves fewer bytes than the send holds (sometimes zero), so the
/// sender cannot tell it finished from served bytes alone. Authenticated like a
/// response, so a third party cannot forge a completion.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Completion {
    pub from: PublicKey,
    pub transfer_id: String,
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
        self_name: &str,
    ) -> Offer {
        let mut o = Offer {
            from: self.public(),
            self_name: self_name.to_string(),
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

    /// Build and sign a response. `reason` accompanies a decline (`accept =
    /// false`) and is `None` on an accept.
    pub fn sign_response(
        &self,
        transfer_id: &str,
        accept: bool,
        reason: Option<DeclineReason>,
    ) -> Response {
        let mut r = Response {
            from: self.public(),
            transfer_id: transfer_id.to_string(),
            accept,
            reason,
            sig: Vec::new(),
        };
        r.sig = self.sign(&r.signing_bytes());
        r
    }

    /// Build and sign a completion for a received transfer.
    pub fn sign_completion(&self, transfer_id: &str) -> Completion {
        let mut c = Completion {
            from: self.public(),
            transfer_id: transfer_id.to_string(),
            sig: Vec::new(),
        };
        c.sig = self.sign(&c.signing_bytes());
        c
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
        append_bytes(&mut b, self.self_name.as_bytes());
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
        // The decline reason is signed too, so a busy auto-decline cannot be
        // rewritten into a user decline (or vice versa) in flight.
        b.push(match self.reason {
            None => 0,
            Some(DeclineReason::Manual) => 1,
            Some(DeclineReason::Busy) => 2,
        });
        b
    }
}

impl Completion {
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

    /// The bytes the signature covers. A trailing domain byte separates a
    /// completion from a response over the same transfer id, so neither
    /// signature can ever be replayed as the other.
    fn signing_bytes(&self) -> Vec<u8> {
        let mut b = Vec::new();
        append_bytes(&mut b, &self.from.sign);
        append_bytes(&mut b, &self.from.kex);
        append_bytes(&mut b, self.transfer_id.as_bytes());
        b.push(0xC0);
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
        let offer = sender.sign_offer("t1", 123, 3, 900, "blob-ticket-with-nodeid", "sender-self");
        assert_eq!(offer.verify(&trust), Ok(()));
    }

    #[test]
    fn untrusted_sender_rejected() {
        let sender = ident();
        let empty = TrustStore::in_memory();
        let offer = sender.sign_offer("t1", 123, 1, 10, "ticket", "sender-self");
        assert_eq!(offer.verify(&empty), Err(VerifyError::Untrusted));
    }

    #[test]
    fn tampered_ticket_is_bad_signature() {
        let sender = ident();
        let trust = TrustStore::in_memory();
        trust.add(sender.public(), "sender").unwrap();
        let mut offer = sender.sign_offer("t1", 123, 1, 10, "real-node-ticket", "sender-self");
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
        let mut forged = attacker.sign_offer("t1", 1, 1, 1, "attacker-ticket", "attacker-self");
        forged.from = sender.public();
        assert_eq!(forged.verify(&trust), Err(VerifyError::BadSignature));
    }

    #[test]
    fn response_round_trip_and_spoof_rejected() {
        let receiver = ident();
        let trust = TrustStore::in_memory();
        trust.add(receiver.public(), "receiver").unwrap();
        let ok = receiver.sign_response("t1", true, None);
        assert_eq!(ok.verify(&trust), Ok(()));

        // A decline carries a reason and still verifies.
        let busy = receiver.sign_response("t1", false, Some(DeclineReason::Busy));
        assert_eq!(busy.verify(&trust), Ok(()));

        let stranger = ident();
        let spoof = stranger.sign_response("t1", true, None);
        assert_eq!(spoof.verify(&trust), Err(VerifyError::Untrusted));
    }
}
