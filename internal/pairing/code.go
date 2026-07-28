package pairing

import (
	"crypto/hkdf"
	"crypto/sha256"
	"encoding/binary"
	"encoding/base32"
	"fmt"
	"strings"
)

// lowerBase32 is base32 without padding, lowercased at use — croc codes are
// lowercase hyphenated words, and a short alphanumeric tail reads like one.
var lowerBase32 = base32.NewEncoding("abcdefghijklmnopqrstuvwxyz234567").WithPadding(base32.NoPadding)

// DeriveCode turns a paired-device shared secret plus a per-transfer id into a
// croc code phrase that both sides compute identically and no human ever types.
//
// croc derives the relay room from the first 4 characters of the code, so two
// transfers whose codes share a 4-char prefix collide on the relay. We front
// the code with a 4-digit block taken from the HKDF output (like croc's own
// random names) so distinct transferIds get well-spread rooms. The tail is a
// base32 slice of the same output, giving ≥6 characters total (croc's minimum).
func DeriveCode(secret []byte, transferID string) (string, error) {
	out, err := hkdf.Key(sha256.New, secret, nil, "floppy/code/"+transferID, 12)
	if err != nil {
		return "", fmt.Errorf("pairing: deriving code: %w", err)
	}
	room := binary.BigEndian.Uint16(out[:2]) % 10000
	tail := lowerBase32.EncodeToString(out[2:])
	return fmt.Sprintf("%04d-%s", room, tail), nil
}

// SAS is the short-authentication-string both devices display during pairing.
// The user confirms the two screens match, which defeats a man-in-the-middle on
// the pairing exchange. It is a deterministic function of the shared secret, so
// both sides always show the same digits.
func SAS(secret []byte) (string, error) {
	out, err := hkdf.Key(sha256.New, secret, nil, "floppy/sas", 4)
	if err != nil {
		return "", fmt.Errorf("pairing: deriving sas: %w", err)
	}
	n := binary.BigEndian.Uint32(out) % 1000000
	return fmt.Sprintf("%06d", n), nil
}

// FormatSAS groups the SAS as "123 456" for easier reading aloud.
func FormatSAS(sas string) string {
	if len(sas) != 6 {
		return sas
	}
	return sas[:3] + " " + sas[3:]
}

// normalizeName trims a pairing display name; empty falls back to a fingerprint
// prefix so a device is never nameless in the UI.
func normalizeName(name string, key PublicKey) string {
	if n := strings.TrimSpace(name); n != "" {
		return n
	}
	return "device-" + key.Fingerprint()[:8]
}
