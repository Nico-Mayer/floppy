// Trusted-device identity: a per-install keypair ported from the Go
// `internal/pairing`. Two key types in one identity — Ed25519 signs offers and
// is the device's stable identity; X25519 does the ECDH that yields the shared
// secret two paired devices confirm via the SAS. Ed25519 can't do ECDH and
// X25519 can't sign, so a device that both proves who it is and shares a secret
// needs both. Knows nothing about the UI or the network.
//
// Wire contract preserved from the Go build: the pairing-code encoding
// (base64url of sign‖kex) and the fingerprint (hex SHA-256 of sign‖kex) are
// byte-for-byte identical, and X25519 is RFC 7748 so the ECDH interops.

use std::path::{Path, PathBuf};

use base64::engine::general_purpose::URL_SAFE_NO_PAD as B64URL;
use base64::Engine;
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use x25519_dalek::{PublicKey as XPublicKey, StaticSecret};

const KEY_LEN: usize = 32;
const SIG_LEN: usize = 64;

/// A device's public identity: the two public keys a peer needs to verify its
/// signatures (`sign`) and complete an ECDH with it (`kex`). Carried by a QR
/// code during pairing and recorded in the trust store.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PublicKey {
    pub sign: Vec<u8>, // Ed25519 public key (32 bytes)
    pub kex: Vec<u8>,  // X25519 public key (32 bytes)
}

impl PublicKey {
    /// Stable, comparable device identity: hex SHA-256 of both public keys.
    /// The trust-store key and (truncated) what users see.
    pub fn fingerprint(&self) -> String {
        let mut h = Sha256::new();
        h.update(&self.sign);
        h.update(&self.kex);
        hex::encode(h.finalize())
    }

    /// Render as a single URL-safe string for a QR / paste. The two fixed-size
    /// keys are concatenated raw (sign‖kex), not JSON-wrapped — every character
    /// counts when a human scans or types it.
    pub fn encode(&self) -> String {
        let mut b = Vec::with_capacity(self.sign.len() + self.kex.len());
        b.extend_from_slice(&self.sign);
        b.extend_from_slice(&self.kex);
        B64URL.encode(b)
    }

    /// Parse a string produced by `encode`.
    pub fn decode(s: &str) -> Result<PublicKey, String> {
        let raw = B64URL.decode(s.trim()).map_err(|e| format!("decoding public key: {e}"))?;
        if raw.len() != KEY_LEN * 2 {
            return Err(format!("bad public key length {}", raw.len()));
        }
        Ok(PublicKey { sign: raw[..KEY_LEN].to_vec(), kex: raw[KEY_LEN..].to_vec() })
    }

    /// The Ed25519 verifying key, if `sign` is a valid point.
    pub(crate) fn verifying_key(&self) -> Option<VerifyingKey> {
        let bytes: [u8; KEY_LEN] = self.sign.as_slice().try_into().ok()?;
        VerifyingKey::from_bytes(&bytes).ok()
    }
}

/// This install's long-lived keypair. Create or load with `load_or_create`.
pub struct Identity {
    signing: SigningKey,
    kex: StaticSecret,
}

/// On-disk form: the two private seeds. Public keys are recomputed on load so
/// they can never drift from the privates.
#[derive(Serialize, Deserialize)]
struct DiskIdentity {
    sign_seed: Vec<u8>, // Ed25519 seed (32 bytes)
    kex_priv: Vec<u8>,  // X25519 private scalar (32 bytes)
}

const IDENTITY_FILE: &str = "identity.json";

impl Identity {
    /// Load the identity stored in `dir`, generating and persisting a fresh one
    /// on first run. `dir` is injectable so two instances (or a test) run side
    /// by side with distinct identities. The key file is written 0600.
    pub fn load_or_create(dir: &Path) -> Result<Identity, String> {
        std::fs::create_dir_all(dir).map_err(|e| format!("creating identity dir: {e}"))?;
        let path = dir.join(IDENTITY_FILE);
        match std::fs::read(&path) {
            Ok(data) => Self::from_disk(
                serde_json::from_slice(&data).map_err(|e| format!("parsing identity: {e}"))?,
            ),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Self::create(&path),
            Err(e) => Err(format!("reading identity: {e}")),
        }
    }

    fn create(path: &Path) -> Result<Identity, String> {
        let mut sign_seed = [0u8; KEY_LEN];
        let mut kex_seed = [0u8; KEY_LEN];
        getrandom::fill(&mut sign_seed).map_err(|e| format!("rng: {e}"))?;
        getrandom::fill(&mut kex_seed).map_err(|e| format!("rng: {e}"))?;
        let kex = StaticSecret::from(kex_seed); // clamps on use (RFC 7748)
        let disk = DiskIdentity { sign_seed: sign_seed.to_vec(), kex_priv: kex.to_bytes().to_vec() };
        let blob = serde_json::to_vec(&disk).map_err(|e| format!("marshaling identity: {e}"))?;
        write_file_atomic(path, &blob).map_err(|e| format!("writing identity: {e}"))?;
        Self::from_disk(disk)
    }

    fn from_disk(disk: DiskIdentity) -> Result<Identity, String> {
        let sign_seed: [u8; KEY_LEN] =
            disk.sign_seed.as_slice().try_into().map_err(|_| "bad signing seed length")?;
        let kex_priv: [u8; KEY_LEN] =
            disk.kex_priv.as_slice().try_into().map_err(|_| "bad kex key length")?;
        Ok(Identity { signing: SigningKey::from_bytes(&sign_seed), kex: StaticSecret::from(kex_priv) })
    }

    /// The device's public identity — safe to share (QR, trust store).
    pub fn public(&self) -> PublicKey {
        PublicKey {
            sign: self.signing.verifying_key().to_bytes().to_vec(),
            kex: XPublicKey::from(&self.kex).to_bytes().to_vec(),
        }
    }

    #[allow(dead_code)] // used in tests; the public()-derived form is used elsewhere
    pub fn fingerprint(&self) -> String {
        self.public().fingerprint()
    }

    /// Sign `msg` with the device's Ed25519 key.
    pub(crate) fn sign(&self, msg: &[u8]) -> Vec<u8> {
        self.signing.sign(msg).to_bytes().to_vec()
    }

    /// X25519 ECDH between this identity and `peer`. Both paired devices compute
    /// the identical value — the seed the SAS comes from.
    pub fn shared_secret(&self, peer: &PublicKey) -> Result<[u8; 32], String> {
        let peer_kex: [u8; KEY_LEN] =
            peer.kex.as_slice().try_into().map_err(|_| "bad peer kex key")?;
        Ok(self.kex.diffie_hellman(&XPublicKey::from(peer_kex)).to_bytes())
    }

    /// Proof of ownership for broker registration.
    pub fn sign_register(&self) -> Vec<u8> {
        self.sign(&register_message(&self.public()))
    }
}

/// Verify an Ed25519 signature over `msg` by `pk`.
pub(crate) fn verify(pk: &PublicKey, msg: &[u8], sig: &[u8]) -> bool {
    let Some(vk) = pk.verifying_key() else { return false };
    let sig: [u8; SIG_LEN] = match sig.try_into() {
        Ok(s) => s,
        Err(_) => return false,
    };
    vk.verify_strict(msg, &ed25519_dalek::Signature::from_bytes(&sig)).is_ok()
}

/// The payload a device signs to prove it owns the identity it registers with
/// the broker. Binds the fingerprint so a signature for one device can't be
/// replayed to register another. (Replay caveat carried over from the Go
/// build — a real deployment adds a broker nonce.)
fn register_message(pk: &PublicKey) -> Vec<u8> {
    let mut m = b"floppy/register:".to_vec();
    m.extend_from_slice(pk.fingerprint().as_bytes());
    m
}

/// Whether `sig` is a valid registration proof for `pk`. The Go broker does the
/// live verification; this mirror is kept for the wire contract and tests.
#[allow(dead_code)]
pub fn verify_register(pk: &PublicKey, sig: &[u8]) -> bool {
    verify(pk, &register_message(pk), sig)
}

/// Write via a temp file + rename so a crash mid-write never leaves a
/// half-written file. On Unix the file is created 0600. Shared with the trust
/// store, which relies on the same discipline.
pub(crate) fn write_file_atomic(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let dir = path.parent().unwrap_or(Path::new("."));
    let tmp: PathBuf = dir.join(format!(".tmp-{}", path.file_name().unwrap().to_string_lossy()));
    std::fs::write(&tmp, data)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&tmp, std::fs::Permissions::from_mode(0o600))?;
    }
    std::fs::rename(&tmp, path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_decode_roundtrip_and_fingerprint_stable() {
        let dir = tempfile::tempdir().unwrap();
        let id = Identity::load_or_create(dir.path()).unwrap();
        let pk = id.public();
        assert_eq!(pk.sign.len(), 32);
        assert_eq!(pk.kex.len(), 32);
        let encoded = pk.encode();
        assert_eq!(PublicKey::decode(&encoded).unwrap(), pk);
        assert_eq!(id.fingerprint().len(), 64); // hex sha256
    }

    #[test]
    fn identity_persists_across_loads() {
        let dir = tempfile::tempdir().unwrap();
        let fp1 = Identity::load_or_create(dir.path()).unwrap().fingerprint();
        let fp2 = Identity::load_or_create(dir.path()).unwrap().fingerprint();
        assert_eq!(fp1, fp2);
    }

    #[test]
    fn ecdh_and_sas_agree_between_peers() {
        let a = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap();
        let b = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap();
        let sa = a.shared_secret(&b.public()).unwrap();
        let sb = b.shared_secret(&a.public()).unwrap();
        assert_eq!(sa, sb);
        assert_ne!(sa, [0u8; 32]);
    }

    #[test]
    fn register_proof_verifies() {
        let id = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap();
        assert!(verify_register(&id.public(), &id.sign_register()));
        // A different identity's proof does not verify for this key.
        let other = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap();
        assert!(!verify_register(&id.public(), &other.sign_register()));
    }
}
