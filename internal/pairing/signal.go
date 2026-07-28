package pairing

import (
	"crypto/ed25519"
	"encoding/binary"
)

// Signal is the application-level message two paired devices exchange over the
// rendezvous. The broker forwards it as an opaque blob; only the endpoints
// understand it. An offer flows sender→receiver; a response flows back; a ready
// tells the receiver the sender's croc endpoint is up so it can join (sender
// first, mirroring the classic code flow); an unreachable is synthesized by the
// client when the broker reports the target offline.
type Signal struct {
	Kind       string    `json:"kind"` // see constants below
	Offer      *Offer    `json:"offer,omitempty"`
	Response   *Response `json:"response,omitempty"`
	TransferID string    `json:"transfer_id,omitempty"` // ready
	To         string    `json:"to,omitempty"`          // unreachable: the offline fingerprint
}

// Signal kinds.
const (
	SignalOffer       = "offer"
	SignalResponse    = "response"
	SignalReady       = "ready"
	SignalUnreachable = "unreachable"
)

// Response is the receiver's signed answer to an offer. It is authenticated the
// same way an offer is — the sender verifies From is trusted and the signature
// holds before acting on Accept, so a third party cannot spoof an acceptance to
// make a device start sending.
type Response struct {
	From       PublicKey `json:"from"`
	TransferID string    `json:"transfer_id"`
	Accept     bool      `json:"accept"`
	Sig        []byte    `json:"sig"`
}

// SignResponse builds and signs a response from this identity.
func (id *Identity) SignResponse(transferID string, accept bool) Response {
	r := Response{From: id.Public(), TransferID: transferID, Accept: accept}
	r.Sig = ed25519.Sign(id.signPriv, r.signingBytes())
	return r
}

// Verify checks the response comes from a trusted device with an intact
// signature. Same error vocabulary as Offer.Verify.
func (r Response) Verify(trust *TrustStore) error {
	if !trust.Trusted(r.From) {
		return ErrUntrusted
	}
	if len(r.From.Sign) != ed25519.PublicKeySize ||
		!ed25519.Verify(ed25519.PublicKey(r.From.Sign), r.signingBytes(), r.Sig) {
		return ErrBadSignature
	}
	return nil
}

func (r Response) signingBytes() []byte {
	var b []byte
	appendBytes := func(p []byte) { b = binary.BigEndian.AppendUint32(b, uint32(len(p))); b = append(b, p...) }
	appendBytes(r.From.Sign)
	appendBytes(r.From.Kex)
	appendBytes([]byte(r.TransferID))
	var accept byte
	if r.Accept {
		accept = 1
	}
	return append(b, accept)
}
