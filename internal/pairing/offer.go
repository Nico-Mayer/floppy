package pairing

import (
	"crypto/ed25519"
	"encoding/binary"
	"errors"
)

// Errors from Verify. Their identity (not text) is the contract for callers
// that want to distinguish "I don't know this device" from "the signature is
// forged" — the first may prompt a pairing, the second is dropped silently.
var (
	// ErrUntrusted means the offer's sender is not in the trust store.
	ErrUntrusted = errors.New("pairing: sender not trusted")
	// ErrBadSignature means the offer's signature does not verify against the
	// sender's key (tampered or forged).
	ErrBadSignature = errors.New("pairing: bad offer signature")
)

// Offer is a signed request to send files to a trusted device. It carries no
// file contents and no code — the code is derived from the shared secret once
// the receiver accepts. The receiver verifies From against its trust store and
// the signature against From.Sign before showing anything to the user.
type Offer struct {
	From       PublicKey `json:"from"`
	TransferID string    `json:"transfer_id"`
	TS         int64     `json:"ts"` // unix seconds, supplied by the caller
	FileCount  int       `json:"file_count"`
	TotalBytes int64     `json:"total_bytes"`
	Sig        []byte    `json:"sig"`
}

// SignOffer builds and signs an offer from this identity. ts is passed in (not
// read from the clock) so the caller owns time and tests stay deterministic.
func (id *Identity) SignOffer(transferID string, ts int64, fileCount int, totalBytes int64) Offer {
	o := Offer{
		From:       id.Public(),
		TransferID: transferID,
		TS:         ts,
		FileCount:  fileCount,
		TotalBytes: totalBytes,
	}
	o.Sig = ed25519.Sign(id.signPriv, o.signingBytes())
	return o
}

// Verify checks that the offer comes from a trusted device and its signature is
// intact. Returns ErrUntrusted or ErrBadSignature on failure; nil when the
// offer is genuinely from the trusted device it claims.
func (o Offer) Verify(trust *TrustStore) error {
	if !trust.Trusted(o.From) {
		return ErrUntrusted
	}
	if len(o.From.Sign) != ed25519.PublicKeySize ||
		!ed25519.Verify(ed25519.PublicKey(o.From.Sign), o.signingBytes(), o.Sig) {
		return ErrBadSignature
	}
	return nil
}

// signingBytes is the canonical byte string the signature covers: every field
// except Sig, length-prefixed so no two distinct offers can encode to the same
// bytes. Deterministic and independent of JSON field ordering.
func (o Offer) signingBytes() []byte {
	var b []byte
	appendBytes := func(p []byte) { b = binary.BigEndian.AppendUint32(b, uint32(len(p))); b = append(b, p...) }
	appendU64 := func(n uint64) { b = binary.BigEndian.AppendUint64(b, n) }

	appendBytes(o.From.Sign)
	appendBytes(o.From.Kex)
	appendBytes([]byte(o.TransferID))
	appendU64(uint64(o.TS))
	appendU64(uint64(o.FileCount))
	appendU64(uint64(o.TotalBytes))
	return b
}
