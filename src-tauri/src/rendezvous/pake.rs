// The quick-share cryptographic core: a SPAKE2 PAKE over the code phrase, then
// an AEAD-sealed iroh ticket under the derived key.
//
// - SPAKE2 (symmetric) turns the shared code into a shared key ONLY if both
//   sides used the same code in the same room. A wrong code yields a different
//   key on each side, so the seal never opens — and nothing is revealed.
// - The iroh ticket (which carries the sender's NodeId) is sealed under the
//   HKDF-derived key with ChaCha20-Poly1305. Because the whole ticket is
//   authenticated, a party that does not know the code cannot substitute a
//   NodeId the receiver will accept — any tampering fails the AEAD tag. That is
//   the NodeId binding the spec requires; the receiver then pins the ticket's
//   NodeId when it dials.

use chacha20poly1305::aead::{Aead, Generate};
use chacha20poly1305::{ChaCha20Poly1305, KeyInit, Nonce};
use hkdf::Hkdf;
use sha2::Sha256;
use spake2::{Ed25519Group, Identity, Password, Spake2};

/// Domain separator for the HKDF step — ties the derived key to this protocol.
const HKDF_INFO: &[u8] = b"floppy quick-share v1";
const NONCE_LEN: usize = 12;

/// A running SPAKE2 exchange, awaiting the peer's message.
pub struct Handshake(Spake2<Ed25519Group>);

/// Begin a symmetric SPAKE2 exchange. `room` is the (public) mailbox id used as
/// the SPAKE2 identity; `code` is the full normalized code phrase used as the
/// password. Returns our outbound message to relay to the peer.
pub fn start(code: &str, room: &str) -> (Handshake, Vec<u8>) {
    let (state, msg) = Spake2::<Ed25519Group>::start_symmetric(
        &Password::new(code.as_bytes()),
        &Identity::new(room.as_bytes()),
    );
    (Handshake(state), msg)
}

impl Handshake {
    /// Finish the exchange with the peer's message, deriving a 32-byte AEAD key.
    /// Fails if the peer used a different code/room (the PAKE rejects), so no
    /// usable key — and no ticket — is ever produced for a wrong code.
    pub fn finish(self, peer_msg: &[u8]) -> Result<[u8; 32], String> {
        let shared = self.0.finish(peer_msg).map_err(|_| "code did not match".to_string())?;
        let hk = Hkdf::<Sha256>::new(None, &shared);
        let mut key = [0u8; 32];
        hk.expand(HKDF_INFO, &mut key).map_err(|_| "key derivation failed".to_string())?;
        Ok(key)
    }
}

/// Seal a plaintext (the iroh ticket) under the PAKE key. The random nonce is
/// prepended to the ciphertext.
pub fn seal(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = ChaCha20Poly1305::new_from_slice(key).map_err(|_| "bad key".to_string())?;
    let nonce = Nonce::generate();
    let ct = cipher.encrypt(&nonce, plaintext).map_err(|_| "seal failed".to_string())?;
    let mut out = Vec::with_capacity(NONCE_LEN + ct.len());
    out.extend_from_slice(nonce.as_slice());
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Open a sealed payload. Fails on a wrong key or any tampering (the AEAD tag),
/// which is exactly how a substituted NodeId / ticket is rejected.
pub fn open(key: &[u8; 32], sealed: &[u8]) -> Result<Vec<u8>, String> {
    if sealed.len() < NONCE_LEN {
        return Err("sealed payload too short".into());
    }
    let (nonce, ct) = sealed.split_at(NONCE_LEN);
    let nonce = Nonce::try_from(nonce).map_err(|_| "bad nonce".to_string())?;
    let cipher = ChaCha20Poly1305::new_from_slice(key).map_err(|_| "bad key".to_string())?;
    cipher
        .decrypt(&nonce, ct)
        .map_err(|_| "could not decrypt — wrong code or tampered ticket".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Run both sides of the PAKE with the given codes/rooms, returning the two
    /// derived keys (each side finishes with the other's message).
    fn exchange(
        code_a: &str,
        room_a: &str,
        code_b: &str,
        room_b: &str,
    ) -> (Result<[u8; 32], String>, Result<[u8; 32], String>) {
        let (a, msg_a) = start(code_a, room_a);
        let (b, msg_b) = start(code_b, room_b);
        (a.finish(&msg_b), b.finish(&msg_a))
    }

    #[test]
    fn matching_code_derives_same_key_and_decrypts() {
        let (ka, kb) = exchange("4821-crayon-mimic", "4821", "4821-crayon-mimic", "4821");
        let (ka, kb) = (ka.unwrap(), kb.unwrap());
        assert_eq!(ka, kb);

        let ticket = b"blobabc-node-xyz-hash";
        let sealed = seal(&ka, ticket).unwrap();
        assert_eq!(open(&kb, &sealed).unwrap(), ticket);
    }

    #[test]
    fn wrong_code_yields_different_keys_and_no_ticket() {
        let (ka, kb) = exchange("4821-crayon-mimic", "4821", "4821-crayon-WRONG", "4821");
        // SPAKE2 still "finishes" on both sides, but the keys differ...
        let (ka, kb) = (ka.unwrap(), kb.unwrap());
        assert_ne!(ka, kb);
        // ...so a ticket sealed by A cannot be opened by B — nothing revealed.
        let sealed = seal(&ka, b"secret-ticket").unwrap();
        assert!(open(&kb, &sealed).is_err());
    }

    #[test]
    fn tampered_ticket_is_rejected() {
        let (ka, kb) = exchange("4821-crayon-mimic", "4821", "4821-crayon-mimic", "4821");
        let (ka, kb) = (ka.unwrap(), kb.unwrap());
        let mut sealed = seal(&ka, b"ticket-with-nodeid").unwrap();
        // Flip a byte in the ciphertext — models a broker swapping in its own
        // NodeId. The AEAD tag fails, so the receiver refuses it.
        let last = sealed.len() - 1;
        sealed[last] ^= 0x01;
        assert!(open(&kb, &sealed).is_err());
    }
}
