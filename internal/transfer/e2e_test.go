package transfer

// Public-relay smoke test. Everything else runs against an in-process relay;
// this is the one test that exercises the real croc infrastructure the app
// ships with. Opt-in: FLOPPY_E2E=1 go test ./internal/transfer/ -run TestE2E

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestE2EPublicRelayRoundTrip(t *testing.T) {
	if os.Getenv("FLOPPY_E2E") != "1" {
		t.Skip("public-relay smoke test; set FLOPPY_E2E=1 to run")
	}
	skipUnlessLive(t)

	m, rec := newLiveManager(t, RelayConfig{}) // zero value = croc public relay
	src, payload := makePayload(t, 2<<20)
	peerDest := t.TempDir()

	id, err := m.Send([]string{src}, SendOptions{})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitType(t, EventCode, 10*time.Second)
	if code.ID != id {
		t.Errorf("code id = %q, want %q", code.ID, id)
	}

	croctool(t, nil, "recv", code.Code, peerDest)

	rec.requireDone(t, 120*time.Second)
	got, err := os.ReadFile(filepath.Join(peerDest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("received file differs: got %d bytes, want %d", len(got), len(payload))
	}
}
