// Short authentication string. Both devices display it during pairing; the
// user confirms the two screens match, defeating a man-in-the-middle on the
// pairing exchange. A deterministic function of the ECDH shared secret, so both
// sides always show the same six digits. Ported from Go `pairing.SAS`.

use hkdf::Hkdf;
use sha2::Sha256;

/// Six-digit SAS derived from the shared secret.
pub fn sas(secret: &[u8]) -> String {
    let hk = Hkdf::<Sha256>::new(None, secret);
    let mut out = [0u8; 4];
    hk.expand(b"floppy/sas", &mut out).expect("hkdf expand");
    let n = u32::from_be_bytes(out) % 1_000_000;
    format!("{n:06}")
}

/// Group the SAS as "123 456" for reading aloud. (The frontend currently
/// formats its own; kept for parity with the Go build.)
#[allow(dead_code)]
pub fn format_sas(sas: &str) -> String {
    if sas.len() != 6 {
        return sas.to_string();
    }
    format!("{} {}", &sas[..3], &sas[3..])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pairing::identity::Identity;

    #[test]
    fn sas_agrees_between_peers_and_is_six_digits() {
        let a = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap();
        let b = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap();
        let sa = sas(&a.shared_secret(&b.public()).unwrap());
        let sb = sas(&b.shared_secret(&a.public()).unwrap());
        assert_eq!(sa, sb);
        assert_eq!(sa.len(), 6);
        assert!(sa.chars().all(|c| c.is_ascii_digit()));
        assert_eq!(format_sas(&sa), format!("{} {}", &sa[..3], &sa[3..]));
    }
}
