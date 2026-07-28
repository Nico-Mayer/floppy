package services

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"floppy/internal/broker"
	"floppy/internal/pairing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// startServiceReal builds a PairingService that dials a real broker over
// WebSocket (rv left nil → ServiceStartup runs broker.Dial). This exercises the
// register handshake, the client read loop, and JSON signal encoding for real —
// everything the in-memory hub stubs out.
func startServiceReal(t *testing.T, dir, brokerURL string, xfer transferer) (*PairingService, chan capturedEvent) {
	t.Helper()
	events := make(chan capturedEvent, 16)
	s := &PairingService{
		IdentityDir: dir,
		BrokerURL:   brokerURL,
		xfer:        xfer,
		emit:        func(name string, data any) { events <- capturedEvent{name, data} },
	}
	if err := s.ServiceStartup(context.Background(), application.ServiceOptions{}); err != nil {
		t.Fatalf("startup: %v", err)
	}
	if s.rv == nil {
		t.Fatal("service did not connect to the broker")
	}
	t.Cleanup(func() { _ = s.ServiceShutdown() })
	return s, events
}

// TestTrustedTransferOverRealBroker runs the full accept path across an actual
// broker WebSocket: Alice's offer is routed to Bob, Bob accepts, the acceptance
// is routed back, and both sides derive the identical croc code — the desktop
// end-to-end path, minus only the native window and the real croc transfer.
func TestTrustedTransferOverRealBroker(t *testing.T) {
	srv := httptest.NewServer(broker.New().Handler())
	t.Cleanup(srv.Close)
	url := "ws" + strings.TrimPrefix(srv.URL, "http") + "/"

	dirA, dirB := t.TempDir(), t.TempDir()
	idA, err := pairing.LoadOrCreate(dirA)
	if err != nil {
		t.Fatal(err)
	}
	idB, err := pairing.LoadOrCreate(dirB)
	if err != nil {
		t.Fatal(err)
	}

	xferA, xferB := &fakeTransfer{}, &fakeTransfer{}
	a, evA := startServiceReal(t, dirA, url, xferA)
	b, evB := startServiceReal(t, dirB, url, xferB)

	// Mutual trust (stands in for the pairing UI, section 4).
	if err := a.trust.Add(idB.Public(), "Bob"); err != nil {
		t.Fatal(err)
	}
	if err := b.trust.Add(idA.Public(), "Alice"); err != nil {
		t.Fatal(err)
	}

	paths := []string{"/tmp/report.pdf", "/tmp/notes.txt"}
	transferID, err := a.SendTo(idB.Fingerprint(), paths)
	if err != nil {
		t.Fatalf("SendTo: %v", err)
	}

	offerEv := waitEvent(t, evB, EventPairingOffer).data.(PairingOfferEvent)
	if offerEv.TransferID != transferID || offerEv.FromName != "Alice" || offerEv.FileCount != 2 {
		t.Fatalf("offer survived the wire wrong: %+v", offerEv)
	}

	if err := b.Accept(transferID); err != nil {
		t.Fatalf("Accept: %v", err)
	}
	waitEvent(t, evA, EventPairingAccepted) // sender started
	waitEvent(t, evB, EventPairingAccepted) // receiver joined after ready

	xferA.mu.Lock()
	xferB.mu.Lock()
	defer xferA.mu.Unlock()
	defer xferB.mu.Unlock()
	if xferA.sendCode == "" || xferA.sendCode != xferB.recvCode {
		t.Fatalf("derived codes differ over the wire: send %q recv %q", xferA.sendCode, xferB.recvCode)
	}
	if len(xferA.sendPaths) != 2 {
		t.Fatalf("sender lost paths over the wire: %v", xferA.sendPaths)
	}
}

// TestOfferToOfflinePeerOverRealBroker proves the unreachable path: Alice offers
// to a device that never connected, and the broker's unreachable notice comes
// back as a pairing:error over the real socket.
func TestOfferToOfflinePeerOverRealBroker(t *testing.T) {
	srv := httptest.NewServer(broker.New().Handler())
	t.Cleanup(srv.Close)
	url := "ws" + strings.TrimPrefix(srv.URL, "http") + "/"

	dirA := t.TempDir()
	if _, err := pairing.LoadOrCreate(dirA); err != nil {
		t.Fatal(err)
	}
	// Bob has an identity but never starts a service / connects.
	idB, err := pairing.LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}

	a, evA := startServiceReal(t, dirA, url, &fakeTransfer{})
	if err := a.trust.Add(idB.Public(), "Bob"); err != nil {
		t.Fatal(err)
	}

	transferID, err := a.SendTo(idB.Fingerprint(), []string{"/tmp/x"})
	if err != nil {
		t.Fatalf("SendTo: %v", err)
	}
	errEv := waitEvent(t, evA, EventPairingError).data.(PairingErrorEvent)
	if errEv.TransferID != transferID || errEv.Code != "unreachable" {
		t.Fatalf("expected unreachable error, got %+v", errEv)
	}
}
