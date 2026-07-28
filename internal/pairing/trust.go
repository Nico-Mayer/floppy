package pairing

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// TrustedDevice is one entry in the trust store: a peer's public identity plus
// a human name chosen during pairing.
type TrustedDevice struct {
	Key  PublicKey `json:"key"`
	Name string    `json:"name"`
}

// Fingerprint is shorthand for the device's public-key fingerprint — the key
// under which it is stored.
func (d TrustedDevice) Fingerprint() string { return d.Key.Fingerprint() }

const trustFile = "trust.json"

// TrustStore is the set of devices this install trusts, backed by a JSON file
// under the identity dir. Every mutation persists immediately (atomic write),
// so the on-disk state always matches memory. Safe for concurrent use.
type TrustStore struct {
	path string

	mu      sync.RWMutex
	devices map[string]TrustedDevice // keyed by fingerprint
}

// LoadTrustStore opens (or creates empty) the trust store in dir. A missing
// file is not an error — a fresh install trusts nobody.
func LoadTrustStore(dir string) (*TrustStore, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, fmt.Errorf("pairing: creating trust dir: %w", err)
	}
	ts := &TrustStore{
		path:    filepath.Join(dir, trustFile),
		devices: make(map[string]TrustedDevice),
	}
	data, err := os.ReadFile(ts.path)
	if os.IsNotExist(err) {
		return ts, nil
	}
	if err != nil {
		return nil, fmt.Errorf("pairing: reading trust store: %w", err)
	}
	var list []TrustedDevice
	if err := json.Unmarshal(data, &list); err != nil {
		return nil, fmt.Errorf("pairing: parsing trust store: %w", err)
	}
	for _, d := range list {
		ts.devices[d.Fingerprint()] = d
	}
	return ts, nil
}

// Add records (or renames) a trusted device and persists the store.
func (ts *TrustStore) Add(key PublicKey, name string) error {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.devices[key.Fingerprint()] = TrustedDevice{Key: key, Name: normalizeName(name, key)}
	return ts.saveLocked()
}

// Remove un-trusts a device by fingerprint and persists. Removing an unknown
// fingerprint is a no-op (still persists — cheap, keeps the call idempotent).
func (ts *TrustStore) Remove(fingerprint string) error {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	delete(ts.devices, fingerprint)
	return ts.saveLocked()
}

// Get returns the trusted device for a fingerprint, if any.
func (ts *TrustStore) Get(fingerprint string) (TrustedDevice, bool) {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	d, ok := ts.devices[fingerprint]
	return d, ok
}

// Trusted reports whether a public key belongs to a trusted device.
func (ts *TrustStore) Trusted(key PublicKey) bool {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	_, ok := ts.devices[key.Fingerprint()]
	return ok
}

// List returns all trusted devices in no particular order.
func (ts *TrustStore) List() []TrustedDevice {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	out := make([]TrustedDevice, 0, len(ts.devices))
	for _, d := range ts.devices {
		out = append(out, d)
	}
	return out
}

// saveLocked writes the current set atomically; ts.mu must be held.
func (ts *TrustStore) saveLocked() error {
	list := make([]TrustedDevice, 0, len(ts.devices))
	for _, d := range ts.devices {
		list = append(list, d)
	}
	blob, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return fmt.Errorf("pairing: marshaling trust store: %w", err)
	}
	if err := writeFileAtomic(ts.path, blob, 0o600); err != nil {
		return fmt.Errorf("pairing: writing trust store: %w", err)
	}
	return nil
}
