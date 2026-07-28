// Package pairing is the trusted-device core: a per-install keypair, a local
// trust store, and the crypto that lets two paired devices transfer without a
// typed code. It knows nothing about croc, Wails, or the network — it produces
// a croc code phrase and signs/verifies offers; the layers above carry those
// over a rendezvous and hand the code to transfer.Manager.
//
// Two key types live in one identity on purpose: an Ed25519 pair signs offers
// and is the device's stable identity, and an X25519 pair does the ECDH that
// yields the shared secret two paired devices derive their transfer codes from.
// Ed25519 cannot do ECDH and X25519 cannot sign, so a device that both proves
// who it is and shares a secret needs both.
package pairing

import (
	"crypto/ecdh"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// PublicKey is a device's public identity: the two public keys a peer needs to
// verify its signatures (Sign) and complete an ECDH with it (Kex). It is what a
// QR code carries during pairing and what a TrustStore records.
type PublicKey struct {
	Sign []byte `json:"sign"` // Ed25519 public key (32 bytes)
	Kex  []byte `json:"kex"`  // X25519 public key (32 bytes)
}

// Fingerprint is the stable, comparable identity of a device: the hex SHA-256
// of both public keys. Used as the trust-store key and shown (truncated) to
// users. Two devices with the same fingerprint are the same identity.
func (pk PublicKey) Fingerprint() string {
	h := sha256.New()
	h.Write(pk.Sign)
	h.Write(pk.Kex)
	return hex.EncodeToString(h.Sum(nil))
}

// kexKeySize is the X25519 public-key length. crypto/ecdh exposes no constant
// for it, so name it here where the fixed wire layout depends on it.
const kexKeySize = 32

// Encode renders a public identity as a single URL-safe string — what a QR code
// carries and what a user pastes to pair. The two fixed-size public keys are
// concatenated raw (sign‖kex) rather than JSON-wrapped: the pairing code is
// typed/pasted/scanned by hand, so every character counts (~86 vs ~150).
func (pk PublicKey) Encode() string {
	b := make([]byte, 0, len(pk.Sign)+len(pk.Kex))
	b = append(b, pk.Sign...)
	b = append(b, pk.Kex...)
	return base64.RawURLEncoding.EncodeToString(b)
}

// DecodePublicKey parses a string produced by PublicKey.Encode.
func DecodePublicKey(s string) (PublicKey, error) {
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(s))
	if err != nil {
		return PublicKey{}, fmt.Errorf("pairing: decoding public key: %w", err)
	}
	if len(raw) != ed25519.PublicKeySize+kexKeySize {
		return PublicKey{}, fmt.Errorf("pairing: bad public key length %d", len(raw))
	}
	return PublicKey{
		Sign: raw[:ed25519.PublicKeySize],
		Kex:  raw[ed25519.PublicKeySize:],
	}, nil
}

// Identity is this install's long-lived keypair. Create or load it with
// LoadOrCreate; the zero value is not usable.
type Identity struct {
	signPub  ed25519.PublicKey
	signPriv ed25519.PrivateKey
	kexPriv  *ecdh.PrivateKey // X25519
}

// diskIdentity is the on-disk form: the two private seeds, base64 via JSON. The
// public keys are recomputed on load, so they can never drift from the privates.
type diskIdentity struct {
	SignSeed []byte `json:"sign_seed"` // Ed25519 seed (32 bytes)
	KexPriv  []byte `json:"kex_priv"`  // X25519 private scalar (32 bytes)
}

const identityFile = "identity.json"

// LoadOrCreate loads the identity stored in dir, generating and persisting a
// fresh one on first run. dir is injectable so two instances (or a test) can
// run side by side with distinct identities. The private key file is written
// 0600 — it is the whole of the device's secret.
func LoadOrCreate(dir string) (*Identity, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, fmt.Errorf("pairing: creating identity dir: %w", err)
	}
	path := filepath.Join(dir, identityFile)
	data, err := os.ReadFile(path)
	switch {
	case err == nil:
		return loadIdentity(data)
	case os.IsNotExist(err):
		return createIdentity(path)
	default:
		return nil, fmt.Errorf("pairing: reading identity: %w", err)
	}
}

func createIdentity(path string) (*Identity, error) {
	_, signPriv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("pairing: generating signing key: %w", err)
	}
	kexPriv, err := ecdh.X25519().GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("pairing: generating kex key: %w", err)
	}
	disk := diskIdentity{SignSeed: signPriv.Seed(), KexPriv: kexPriv.Bytes()}
	blob, err := json.Marshal(disk)
	if err != nil {
		return nil, fmt.Errorf("pairing: marshaling identity: %w", err)
	}
	if err := writeFileAtomic(path, blob, 0o600); err != nil {
		return nil, fmt.Errorf("pairing: writing identity: %w", err)
	}
	return fromDisk(disk)
}

func loadIdentity(data []byte) (*Identity, error) {
	var disk diskIdentity
	if err := json.Unmarshal(data, &disk); err != nil {
		return nil, fmt.Errorf("pairing: parsing identity: %w", err)
	}
	return fromDisk(disk)
}

func fromDisk(disk diskIdentity) (*Identity, error) {
	if len(disk.SignSeed) != ed25519.SeedSize {
		return nil, fmt.Errorf("pairing: bad signing seed length %d", len(disk.SignSeed))
	}
	signPriv := ed25519.NewKeyFromSeed(disk.SignSeed)
	kexPriv, err := ecdh.X25519().NewPrivateKey(disk.KexPriv)
	if err != nil {
		return nil, fmt.Errorf("pairing: bad kex key: %w", err)
	}
	return &Identity{
		signPub:  signPriv.Public().(ed25519.PublicKey),
		signPriv: signPriv,
		kexPriv:  kexPriv,
	}, nil
}

// Public returns the device's public identity — safe to share (QR, trust store).
func (id *Identity) Public() PublicKey {
	return PublicKey{
		Sign: id.signPub,
		Kex:  id.kexPriv.PublicKey().Bytes(),
	}
}

// Fingerprint is shorthand for id.Public().Fingerprint().
func (id *Identity) Fingerprint() string { return id.Public().Fingerprint() }

// SharedSecret is the X25519 ECDH result between this identity and peer. Both
// paired devices compute the identical value — it is the seed every derived
// transfer code and SAS comes from. Fails if peer.Kex is not a valid X25519
// public key.
func (id *Identity) SharedSecret(peer PublicKey) ([]byte, error) {
	peerKex, err := ecdh.X25519().NewPublicKey(peer.Kex)
	if err != nil {
		return nil, fmt.Errorf("pairing: bad peer kex key: %w", err)
	}
	secret, err := id.kexPriv.ECDH(peerKex)
	if err != nil {
		return nil, fmt.Errorf("pairing: ecdh: %w", err)
	}
	return secret, nil
}

// registerMessage is the payload a device signs to prove it owns the identity
// it registers with the broker. It binds the fingerprint so a signature for one
// device can't be replayed to register another.
//
// NOTE: without a broker-issued nonce this proof is replayable — an observer of
// a register message could re-present it to steal the routing slot for that
// key. Harmless to transfer confidentiality (offers are end-to-end signed and
// the croc code comes from a shared secret the broker never sees), but a real
// deployment should add a challenge. Fine for the desktop-first slice.
func registerMessage(pk PublicKey) []byte {
	return append([]byte("floppy/register:"), []byte(pk.Fingerprint())...)
}

// SignRegister returns this identity's proof of ownership for broker registration.
func (id *Identity) SignRegister() []byte {
	return ed25519.Sign(id.signPriv, registerMessage(id.Public()))
}

// VerifyRegister reports whether sig is a valid registration proof for pk.
func VerifyRegister(pk PublicKey, sig []byte) bool {
	return len(pk.Sign) == ed25519.PublicKeySize &&
		ed25519.Verify(ed25519.PublicKey(pk.Sign), registerMessage(pk), sig)
}

// writeFileAtomic writes via a temp file + rename so a crash mid-write never
// leaves a half-written identity or trust store. Same discipline the trust
// store relies on.
func writeFileAtomic(path string, data []byte, perm os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op after a successful rename
	if err := tmp.Chmod(perm); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return replaceFile(tmpName, path)
}

// How long replaceFile keeps trying a denied replace before giving up. Long
// enough to outlast a scanner's pass over one small JSON file, short enough that
// a genuinely stuck file still reports promptly to the UI.
const replaceRetryBudget = 300 * time.Millisecond

// replaceFile moves tmpName onto path, allowing for Windows' rules about
// replacing an open file.
//
// POSIX rename swaps the directory entry and cares nothing for the destination
// file itself. Windows' MoveFileEx needs delete access to that destination, so
// it fails with "Access is denied" in two cases neither macOS nor Linux has:
// the destination carries the read-only attribute, or another process still
// holds a handle to it — on the identity dir under %AppData%\Roaming that means
// Defender, the search indexer, or a profile-sync agent mid-sweep.
//
// The read-only case is permanent until cleared, so clear it. The open-handle
// case clears itself in milliseconds, so retry briefly rather than failing a
// user action (un-trusting a device) that has nothing wrong with it.
func replaceFile(tmpName, path string) error {
	err := os.Rename(tmpName, path)
	if err == nil {
		return err
	}
	// Only permission errors are worth waiting on; a missing directory or a
	// destination that is really a directory will not fix itself.
	if !errors.Is(err, fs.ErrPermission) {
		return err
	}
	if chmodErr := os.Chmod(path, 0o600); chmodErr == nil {
		// On Windows this drops FILE_ATTRIBUTE_READONLY; elsewhere it is a
		// no-op on a file we own and are about to replace anyway.
		if err = os.Rename(tmpName, path); err == nil {
			return nil
		}
	}
	for wait := 10 * time.Millisecond; wait <= replaceRetryBudget; wait *= 2 {
		time.Sleep(wait)
		if err = os.Rename(tmpName, path); err == nil {
			return nil
		}
		if !errors.Is(err, fs.ErrPermission) {
			return err
		}
	}
	return fmt.Errorf("%w (the file is held open by another program)", err)
}
