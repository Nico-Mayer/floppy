package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
)

// PubKey is a device's public identity on the wire: the two raw public keys,
// carried as one base64url string (sign‖kex) — the same encoding the Rust
// `pairing::PublicKey::encode` produces, so a client's `key` field round-trips.
type pubKey struct {
	sign []byte
	kex  []byte
}

const keyLen = 32

// decodePubKey parses the base64url(sign‖kex) form.
func decodePubKey(encoded string) (pubKey, bool) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil || len(raw) != keyLen*2 {
		return pubKey{}, false
	}
	return pubKey{sign: raw[:keyLen], kex: raw[keyLen:]}, true
}

// fingerprint is the hex SHA-256 of sign‖kex — the routing key, identical to
// the Rust `PublicKey::fingerprint`.
func (p pubKey) fingerprint() string {
	h := sha256.New()
	h.Write(p.sign)
	h.Write(p.kex)
	return hex.EncodeToString(h.Sum(nil))
}

// verifyRegister checks a registration proof: an Ed25519 signature by the
// device's own signing key over "floppy/register:<fingerprint>". Prevents a
// client from claiming another device's routing slot. (Replay caveat unchanged
// from the desktop slice — a real deploy adds a broker nonce.)
func verifyRegister(p pubKey, sig []byte) bool {
	if len(p.sign) != ed25519.PublicKeySize {
		return false
	}
	msg := append([]byte("floppy/register:"), []byte(p.fingerprint())...)
	return ed25519.Verify(ed25519.PublicKey(p.sign), msg, sig)
}
