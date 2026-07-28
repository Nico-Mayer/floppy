package services

import (
	"context"
	"sync"
	"testing"
	"time"

	"floppy/internal/pairing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// memHub is an in-process stand-in for the broker: it routes signals between
// memClients by fingerprint and synthesizes unreachable exactly as the real
// broker does. No WebSocket, no network.
type memHub struct {
	mu      sync.Mutex
	clients map[string]*memClient
}

func newMemHub() *memHub { return &memHub{clients: make(map[string]*memClient)} }

func (h *memHub) connect(fp string) *memClient {
	c := &memClient{hub: h, fp: fp, signals: make(chan pairing.Signal, 8)}
	h.mu.Lock()
	h.clients[fp] = c
	h.mu.Unlock()
	return c
}

type memClient struct {
	hub     *memHub
	fp      string
	signals chan pairing.Signal
}

func (c *memClient) Send(to string, sig pairing.Signal) error {
	c.hub.mu.Lock()
	target := c.hub.clients[to]
	c.hub.mu.Unlock()
	if target == nil {
		c.signals <- pairing.Signal{Kind: pairing.SignalUnreachable, To: to}
		return nil
	}
	target.signals <- sig
	return nil
}

func (c *memClient) Signals() <-chan pairing.Signal { return c.signals }
func (c *memClient) Close() error                    { return nil }

// fakeTransfer records the coded calls so a test can assert both sides derived
// the same code and the sender kept its paths.
type fakeTransfer struct {
	mu        sync.Mutex
	sendCode  string
	sendPaths []string
	recvCode  string
}

func (f *fakeTransfer) SendCoded(paths []string, code string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sendCode, f.sendPaths = code, paths
	return "send-1", nil
}

func (f *fakeTransfer) ReceiveCoded(code string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.recvCode = code
	return "recv-1", nil
}

type capturedEvent struct {
	name string
	data any
}

// startService builds a PairingService against a pre-created identity dir (so
// the test knows the fingerprint up front), an injected rendezvous, and a fake
// transferer. It returns the service and its event channel.
func startService(t *testing.T, dir string, rv rendezvous, xfer transferer) (*PairingService, chan capturedEvent) {
	t.Helper()
	events := make(chan capturedEvent, 16)
	s := &PairingService{
		IdentityDir: dir,
		rv:          rv,
		xfer:        xfer,
		emit:        func(name string, data any) { events <- capturedEvent{name, data} },
	}
	if err := s.ServiceStartup(context.Background(), application.ServiceOptions{}); err != nil {
		t.Fatalf("startup: %v", err)
	}
	return s, events
}

func waitEvent(t *testing.T, ch chan capturedEvent, name string) capturedEvent {
	t.Helper()
	for {
		select {
		case ev := <-ch:
			if ev.name == name {
				return ev
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("timed out waiting for %s", name)
		}
	}
}

func expectNoEvent(t *testing.T, ch chan capturedEvent, within time.Duration) {
	t.Helper()
	select {
	case ev := <-ch:
		t.Fatalf("unexpected event %s", ev.name)
	case <-time.After(within):
	}
}

// pairServices creates two mutually-trusting PairingServices wired through a
// shared in-memory hub. Returns (alice, aliceEvents, aliceXfer, bob, ...).
func pairServices(t *testing.T) (*PairingService, chan capturedEvent, *fakeTransfer, *PairingService, chan capturedEvent, *fakeTransfer) {
	t.Helper()
	dirA, dirB := t.TempDir(), t.TempDir()
	idA, err := pairing.LoadOrCreate(dirA)
	if err != nil {
		t.Fatal(err)
	}
	idB, err := pairing.LoadOrCreate(dirB)
	if err != nil {
		t.Fatal(err)
	}
	hub := newMemHub()
	xferA, xferB := &fakeTransfer{}, &fakeTransfer{}

	a, evA := startService(t, dirA, hub.connect(idA.Fingerprint()), xferA)
	b, evB := startService(t, dirB, hub.connect(idB.Fingerprint()), xferB)

	if err := a.trust.Add(idB.Public(), "Bob"); err != nil {
		t.Fatal(err)
	}
	if err := b.trust.Add(idA.Public(), "Alice"); err != nil {
		t.Fatal(err)
	}
	return a, evA, xferA, b, evB, xferB
}

func TestTrustedSendAcceptDerivesSameCode(t *testing.T) {
	a, evA, xferA, b, evB, xferB := pairServices(t)

	paths := []string{"/tmp/report.pdf"}
	transferID, err := a.SendTo(b.id.Fingerprint(), paths)
	if err != nil {
		t.Fatalf("SendTo: %v", err)
	}

	// Bob is prompted with the offer.
	offerEv := waitEvent(t, evB, EventPairingOffer)
	got := offerEv.data.(PairingOfferEvent)
	if got.TransferID != transferID {
		t.Fatalf("offer transferID = %s, want %s", got.TransferID, transferID)
	}
	if got.FromName != "Alice" || got.FileCount != 1 {
		t.Fatalf("offer payload wrong: %+v", got)
	}

	// Bob accepts → Alice sends first, then signals ready → Bob receives.
	if err := b.Accept(transferID); err != nil {
		t.Fatalf("Accept: %v", err)
	}
	waitEvent(t, evA, EventPairingAccepted) // sender started
	waitEvent(t, evB, EventPairingAccepted) // receiver joined

	xferA.mu.Lock()
	xferB.mu.Lock()
	defer xferA.mu.Unlock()
	defer xferB.mu.Unlock()
	if xferB.recvCode == "" {
		t.Fatal("receiver never got a coded receive")
	}
	if xferA.sendCode != xferB.recvCode {
		t.Fatalf("derived codes differ: send %q recv %q", xferA.sendCode, xferB.recvCode)
	}
	if len(xferA.sendPaths) != 1 || xferA.sendPaths[0] != paths[0] {
		t.Fatalf("sender lost its paths: %v", xferA.sendPaths)
	}
}

func TestTrustedSendDecline(t *testing.T) {
	a, evA, xferA, b, evB, _ := pairServices(t)

	transferID, err := a.SendTo(b.id.Fingerprint(), []string{"/tmp/x"})
	if err != nil {
		t.Fatalf("SendTo: %v", err)
	}
	waitEvent(t, evB, EventPairingOffer)

	if err := b.Decline(transferID); err != nil {
		t.Fatalf("Decline: %v", err)
	}
	declined := waitEvent(t, evA, EventPairingDeclined)
	if declined.data.(PairingStatusEvent).TransferID != transferID {
		t.Fatal("declined event has wrong transferID")
	}

	xferA.mu.Lock()
	defer xferA.mu.Unlock()
	if xferA.sendCode != "" {
		t.Fatal("declined offer must not start a send")
	}
}

func TestUntrustedOfferDropped(t *testing.T) {
	// Alice trusts Bob, but Bob does NOT trust Alice.
	dirA, dirB := t.TempDir(), t.TempDir()
	idA, _ := pairing.LoadOrCreate(dirA)
	idB, _ := pairing.LoadOrCreate(dirB)
	hub := newMemHub()

	a, _ := startService(t, dirA, hub.connect(idA.Fingerprint()), &fakeTransfer{})
	b, evB := startService(t, dirB, hub.connect(idB.Fingerprint()), &fakeTransfer{})
	if err := a.trust.Add(idB.Public(), "Bob"); err != nil {
		t.Fatal(err)
	}

	if _, err := a.SendTo(b.id.Fingerprint(), []string{"/tmp/x"}); err != nil {
		t.Fatalf("SendTo: %v", err)
	}
	// Bob must never surface an offer from an untrusted sender.
	expectNoEvent(t, evB, 300*time.Millisecond)
}

func TestSendToUnknownDeviceRejected(t *testing.T) {
	a, _, _, b, _, _ := pairServices(t)
	if _, err := a.SendTo("not-a-real-fingerprint", []string{"/tmp/x"}); err != errNotTrusted {
		t.Fatalf("SendTo unknown = %v, want errNotTrusted", err)
	}
	_ = b
}
