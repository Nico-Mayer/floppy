package broker

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"floppy/internal/pairing"
)

// dialClient connects to the in-process broker and, unless anonymous, registers
// id. It returns the raw conn so tests can drive the protocol directly.
func dialClient(t *testing.T, url string, id *pairing.Identity, register bool) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { conn.CloseNow() })
	if !register {
		return conn
	}
	if err := wsjson.Write(ctx, conn, Msg{Type: MsgRegister, PubKey: id.Public(), Sig: id.SignRegister()}); err != nil {
		t.Fatalf("register write: %v", err)
	}
	var ok Msg
	if err := wsjson.Read(ctx, conn, &ok); err != nil {
		t.Fatalf("register read: %v", err)
	}
	if ok.Type != MsgOK {
		t.Fatalf("register reply = %q, want ok", ok.Type)
	}
	return conn
}

// startBroker runs the broker in-process (httptest), returning the ws:// URL.
func startBroker(t *testing.T) string {
	t.Helper()
	srv := httptest.NewServer(New().Handler())
	t.Cleanup(srv.Close)
	return "ws" + strings.TrimPrefix(srv.URL, "http") + "/"
}

func read(t *testing.T, conn *websocket.Conn) Msg {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	var m Msg
	if err := wsjson.Read(ctx, conn, &m); err != nil {
		t.Fatalf("read: %v", err)
	}
	return m
}

func write(t *testing.T, conn *websocket.Conn, m Msg) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := wsjson.Write(ctx, conn, m); err != nil {
		t.Fatalf("write: %v", err)
	}
}

func TestOfferRoutedVerbatim(t *testing.T) {
	url := startBroker(t)
	alice, err := pairing.LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	bob, err := pairing.LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}

	aConn := dialClient(t, url, alice, true)
	bConn := dialClient(t, url, bob, true)

	blob := json.RawMessage(`{"transfer_id":"xfer-1","hello":"world"}`)
	write(t, aConn, Msg{Type: MsgOffer, To: bob.Fingerprint(), Blob: blob})

	got := read(t, bConn)
	if got.Type != MsgOffer {
		t.Fatalf("bob got %q, want offer", got.Type)
	}
	if string(got.Blob) != string(blob) {
		t.Fatalf("blob not forwarded verbatim: %s", got.Blob)
	}
}

func TestOfferToUnknownIsUnreachable(t *testing.T) {
	url := startBroker(t)
	alice, err := pairing.LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	aConn := dialClient(t, url, alice, true)

	write(t, aConn, Msg{Type: MsgOffer, To: "deadbeef", Blob: json.RawMessage(`{}`)})

	got := read(t, aConn)
	if got.Type != MsgUnreachable {
		t.Fatalf("got %q, want unreachable", got.Type)
	}
	if got.To != "deadbeef" {
		t.Fatalf("unreachable.To = %q", got.To)
	}
}

func TestBadRegistrationRejected(t *testing.T) {
	url := startBroker(t)
	alice, err := pairing.LoadOrCreate(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	conn := dialClient(t, url, alice, false)

	// Correct pubkey, wrong signature.
	write(t, conn, Msg{Type: MsgRegister, PubKey: alice.Public(), Sig: []byte("not-a-signature")})

	// The broker closes the connection; the next read must fail.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	var m Msg
	if err := wsjson.Read(ctx, conn, &m); err == nil {
		t.Fatalf("expected connection closed, got message %q", m.Type)
	}
}
