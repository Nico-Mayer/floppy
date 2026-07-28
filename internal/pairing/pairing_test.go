package pairing

import (
	"os"
	"path/filepath"
	"testing"
)

// newIdentity makes a throwaway identity in a temp dir.
func newIdentity(t *testing.T) *Identity {
	t.Helper()
	id, err := LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatalf("LoadOrCreate: %v", err)
	}
	return id
}

func TestLoadOrCreatePersists(t *testing.T) {
	dir := t.TempDir()
	first, err := LoadOrCreate(dir)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	second, err := LoadOrCreate(dir)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if first.Fingerprint() != second.Fingerprint() {
		t.Fatalf("identity not stable across reload: %s vs %s", first.Fingerprint(), second.Fingerprint())
	}

	// A fresh dir yields a different identity.
	other := newIdentity(t)
	if other.Fingerprint() == first.Fingerprint() {
		t.Fatal("distinct dirs produced identical identities")
	}
}

func TestIdentityFilePermissions(t *testing.T) {
	dir := t.TempDir()
	if _, err := LoadOrCreate(dir); err != nil {
		t.Fatalf("create: %v", err)
	}
	info, err := os.Stat(filepath.Join(dir, identityFile))
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Fatalf("identity perm = %o, want 600", perm)
	}
}

func TestPublicKeyEncodeRoundTrip(t *testing.T) {
	id := newIdentity(t)
	encoded := id.Public().Encode()
	got, err := DecodePublicKey(encoded)
	if err != nil {
		t.Fatalf("DecodePublicKey: %v", err)
	}
	if got.Fingerprint() != id.Fingerprint() {
		t.Fatal("round-tripped key has a different fingerprint")
	}
	// Whitespace (from a pasted code) is tolerated.
	if _, err := DecodePublicKey("  " + encoded + "\n"); err != nil {
		t.Fatalf("padded decode: %v", err)
	}
	if _, err := DecodePublicKey("not-valid"); err == nil {
		t.Fatal("expected error on garbage input")
	}
}

func TestSharedSecretSymmetric(t *testing.T) {
	a, b := newIdentity(t), newIdentity(t)
	sa, err := a.SharedSecret(b.Public())
	if err != nil {
		t.Fatalf("a.SharedSecret: %v", err)
	}
	sb, err := b.SharedSecret(a.Public())
	if err != nil {
		t.Fatalf("b.SharedSecret: %v", err)
	}
	if string(sa) != string(sb) {
		t.Fatal("shared secrets differ between the two sides")
	}
	if len(sa) == 0 {
		t.Fatal("empty shared secret")
	}
}

func TestSASSymmetricAndFormatted(t *testing.T) {
	a, b := newIdentity(t), newIdentity(t)
	sa, _ := a.SharedSecret(b.Public())
	sb, _ := b.SharedSecret(a.Public())
	x, err := SAS(sa)
	if err != nil {
		t.Fatalf("SAS: %v", err)
	}
	y, err := SAS(sb)
	if err != nil {
		t.Fatalf("SAS: %v", err)
	}
	if x != y {
		t.Fatalf("SAS differ: %s vs %s", x, y)
	}
	if len(x) != 6 {
		t.Fatalf("SAS len = %d, want 6", len(x))
	}
	if got := FormatSAS(x); got != x[:3]+" "+x[3:] {
		t.Fatalf("FormatSAS = %q", got)
	}
}

func TestDeriveCodeDeterministicAndSpread(t *testing.T) {
	a, b := newIdentity(t), newIdentity(t)
	sa, _ := a.SharedSecret(b.Public())
	sb, _ := b.SharedSecret(a.Public())

	// Both sides derive the same code for the same transfer.
	ca, err := DeriveCode(sa, "transfer-1")
	if err != nil {
		t.Fatalf("DeriveCode: %v", err)
	}
	cb, err := DeriveCode(sb, "transfer-1")
	if err != nil {
		t.Fatalf("DeriveCode: %v", err)
	}
	if ca != cb {
		t.Fatalf("code mismatch across sides: %s vs %s", ca, cb)
	}
	if len(ca) < minCodeLenTest {
		t.Fatalf("code %q shorter than croc minimum %d", ca, minCodeLenTest)
	}

	// Distinct transferIds get distinct 4-char relay rooms (croc's collision
	// domain). Check the prefixes spread across many ids.
	rooms := make(map[string]int)
	const n = 500
	for i := range n {
		code, err := DeriveCode(sa, "t-"+string(rune('a'+i%26))+itoa(i))
		if err != nil {
			t.Fatalf("DeriveCode[%d]: %v", i, err)
		}
		rooms[code[:4]]++
	}
	// With 10000 possible rooms and 500 draws, collisions are rare; demand a
	// high distinct ratio rather than perfection (birthday paradox).
	if len(rooms) < n*9/10 {
		t.Fatalf("relay rooms poorly spread: %d distinct of %d", len(rooms), n)
	}
}

func TestOfferSignVerify(t *testing.T) {
	sender, receiverA := newIdentity(t), newIdentity(t)

	trust, err := LoadTrustStore(t.TempDir())
	if err != nil {
		t.Fatalf("LoadTrustStore: %v", err)
	}

	offer := sender.SignOffer("xfer-42", 1700000000, 3, 412_000_000)

	// Untrusted sender is rejected.
	if err := offer.Verify(trust); err != ErrUntrusted {
		t.Fatalf("untrusted verify = %v, want ErrUntrusted", err)
	}

	// Trust the sender → verifies.
	if err := trust.Add(sender.Public(), "Alice"); err != nil {
		t.Fatalf("Add: %v", err)
	}
	if err := offer.Verify(trust); err != nil {
		t.Fatalf("trusted verify = %v, want nil", err)
	}

	// Tampered field → bad signature (sender still trusted).
	tampered := offer
	tampered.FileCount = 99
	if err := tampered.Verify(trust); err != ErrBadSignature {
		t.Fatalf("tampered verify = %v, want ErrBadSignature", err)
	}

	// An unrelated identity cannot forge an offer from the trusted sender:
	// re-signing with a different key changes From, which is untrusted.
	forged := receiverA.SignOffer("xfer-42", 1700000000, 3, 412_000_000)
	if err := forged.Verify(trust); err != ErrUntrusted {
		t.Fatalf("forged verify = %v, want ErrUntrusted", err)
	}
}

func TestTrustStoreCRUDAndPersist(t *testing.T) {
	dir := t.TempDir()
	ts, err := LoadTrustStore(dir)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(ts.List()) != 0 {
		t.Fatal("fresh trust store not empty")
	}

	dev := newIdentity(t).Public()
	if err := ts.Add(dev, "Bob's laptop"); err != nil {
		t.Fatalf("Add: %v", err)
	}
	if !ts.Trusted(dev) {
		t.Fatal("added device not trusted")
	}
	got, ok := ts.Get(dev.Fingerprint())
	if !ok || got.Name != "Bob's laptop" {
		t.Fatalf("Get = %+v ok=%v", got, ok)
	}

	// Empty name falls back to a fingerprint-derived label.
	dev2 := newIdentity(t).Public()
	if err := ts.Add(dev2, "   "); err != nil {
		t.Fatalf("Add blank: %v", err)
	}
	got2, _ := ts.Get(dev2.Fingerprint())
	if got2.Name == "" {
		t.Fatal("blank name not normalized")
	}

	// Persistence: a reload sees both devices.
	reloaded, err := LoadTrustStore(dir)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if len(reloaded.List()) != 2 {
		t.Fatalf("reloaded %d devices, want 2", len(reloaded.List()))
	}

	// Remove + idempotent remove.
	if err := ts.Remove(dev.Fingerprint()); err != nil {
		t.Fatalf("Remove: %v", err)
	}
	if ts.Trusted(dev) {
		t.Fatal("removed device still trusted")
	}
	if err := ts.Remove(dev.Fingerprint()); err != nil {
		t.Fatalf("idempotent Remove: %v", err)
	}
}

// A read-only trust.json must not stop the user un-trusting a device. On
// Windows that attribute makes MoveFileEx refuse the replace outright ("Access
// is denied"), which surfaced as being unable to remove a trusted device; POSIX
// rename ignores it, so this asserts the contract rather than reproducing the
// failure on a Mac.
func TestTrustStoreWritesOverReadOnlyFile(t *testing.T) {
	dir := t.TempDir()
	ts, err := LoadTrustStore(dir)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	dev := newIdentity(t).Public()
	if err := ts.Add(dev, "Bob's laptop"); err != nil {
		t.Fatalf("Add: %v", err)
	}

	path := filepath.Join(dir, trustFile)
	if err := os.Chmod(path, 0o400); err != nil {
		t.Fatalf("chmod read-only: %v", err)
	}
	if err := ts.Remove(dev.Fingerprint()); err != nil {
		t.Fatalf("Remove over read-only store: %v", err)
	}

	reloaded, err := LoadTrustStore(dir)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if len(reloaded.List()) != 0 {
		t.Fatalf("reloaded %d devices, want 0 — removal did not persist", len(reloaded.List()))
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Fatalf("trust store perm = %o, want 600", perm)
	}
}

// minCodeLenTest mirrors croc's 6-char minimum without importing the transfer
// package (pairing has zero deps by design).
const minCodeLenTest = 6

// itoa is a tiny int-to-string to vary transferIds without importing strconv
// into the derive-spread loop's hot path (clarity over cleverness).
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
