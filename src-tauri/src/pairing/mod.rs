// Trusted-device pairing core, ported from the Go `internal/pairing` with the
// same wire contract (pairing-code encoding, fingerprint, signed-offer scheme)
// and equivalent crypto (Ed25519 identity, X25519 ECDH, SHA-256). croc is gone,
// so the transfer is bootstrapped by an iroh ticket carried in the signed offer
// (see offer.rs) rather than a code derived from the shared secret.

pub mod broker;
pub mod identity;
pub mod offer;
pub mod sas;
pub mod self_name;
pub mod service;
pub mod signal;
pub mod trust;

pub use service::{PairingEmitter, PairingEvent, PairingService};
