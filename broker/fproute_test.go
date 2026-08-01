package main

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

// device is a test identity: an Ed25519 keypair plus arbitrary kex bytes.
type device struct {
	priv ed25519.PrivateKey
	pub  ed25519.PublicKey
	kex  []byte
}

func newDevice(t *testing.T) device {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("keygen: %v", err)
	}
	kex := make([]byte, keyLen)
	if _, err := rand.Read(kex); err != nil {
		t.Fatalf("kex: %v", err)
	}
	return device{priv: priv, pub: pub, kex: kex}
}

func (d device) encodedKey() string {
	return base64.RawURLEncoding.EncodeToString(append(append([]byte{}, d.pub...), d.kex...))
}

func (d device) fingerprint() string {
	return pubKey{sign: d.pub, kex: d.kex}.fingerprint()
}

func (d device) registerMsg() FpMsg {
	msg := append([]byte("floppy/register:"), []byte(d.fingerprint())...)
	return FpMsg{Type: fpRegister, Key: d.encodedKey(), Sig: ed25519.Sign(d.priv, msg)}
}

func fpServerURL(t *testing.T) string {
	t.Helper()
	ts := httptest.NewServer(NewFpServer().Handler())
	t.Cleanup(ts.Close)
	return "ws" + strings.TrimPrefix(ts.URL, "http") + "/fp"
}

func register(t *testing.T, url string, d device) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	if err := wsjson.Write(ctx, conn, d.registerMsg()); err != nil {
		t.Fatalf("register write: %v", err)
	}
	var ack FpMsg
	if err := wsjson.Read(ctx, conn, &ack); err != nil || ack.Type != fpOK {
		t.Fatalf("register ack: got (%+v, %v), want ok", ack, err)
	}
	return conn
}

// fpServerURLFast is fpServerURL with a fast keepalive so eviction is testable
// in milliseconds rather than the production tens of seconds.
func fpServerURLFast(t *testing.T, interval, timeout time.Duration) string {
	t.Helper()
	s := NewFpServer()
	s.pingInterval = interval
	s.pingTimeout = timeout
	ts := httptest.NewServer(s.Handler())
	t.Cleanup(ts.Close)
	return "ws" + strings.TrimPrefix(ts.URL, "http") + "/fp"
}

// readLoop drains conn in the background, keeping it responsive (the WebSocket
// library answers pings only while a read is in flight) and surfacing routed
// messages on the returned channel.
func readLoop(conn *websocket.Conn) <-chan FpMsg {
	ch := make(chan FpMsg, 8)
	go func() {
		for {
			var m FpMsg
			if err := wsjson.Read(context.Background(), conn, &m); err != nil {
				close(ch)
				return
			}
			ch <- m
		}
	}()
	return ch
}

// A registered device that stops reading cannot pong, so the heartbeat closes
// it and frees its fingerprint slot for a fresh registration.
func TestFpKeepaliveEvictsSilentConnection(t *testing.T) {
	url := fpServerURLFast(t, 50*time.Millisecond, 50*time.Millisecond)
	a := newDevice(t)
	ca := register(t, url, a)
	defer ca.CloseNow()

	// Stay silent so no pong is sent; the broker pings, times out, and closes.
	time.Sleep(300 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	start := time.Now()
	if _, _, err := ca.Read(ctx); err == nil {
		t.Fatal("expected the silent connection to be closed by the heartbeat")
	} else if time.Since(start) > time.Second {
		t.Fatalf("read did not return promptly (%v) — connection was not evicted", time.Since(start))
	}

	// The freed slot is immediately reusable: the same fingerprint re-registers.
	reuse := register(t, url, a)
	reuse.CloseNow()
}

// A registered device that keeps reading (idle but responsive) is pinged,
// pongs, and stays reachable well past the heartbeat window.
func TestFpKeepaliveIdleResponsiveStaysRegistered(t *testing.T) {
	url := fpServerURLFast(t, 50*time.Millisecond, 50*time.Millisecond)
	a := newDevice(t)
	b := newDevice(t)
	ca := register(t, url, a)
	defer ca.CloseNow()
	cb := register(t, url, b)
	defer cb.CloseNow()
	aMsgs := readLoop(ca) // A idle but responsive across the window
	_ = readLoop(cb)      // B likewise, so it survives to probe A

	// Let several heartbeat windows pass, then B routes a signal to A.
	time.Sleep(400 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := wsjson.Write(ctx, cb, FpMsg{Type: fpSignal, To: a.fingerprint(), Blob: []byte("still-here")}); err != nil {
		t.Fatalf("send: %v", err)
	}
	select {
	case m, ok := <-aMsgs:
		if !ok || m.Type != fpSignal || string(m.Blob) != "still-here" {
			t.Fatalf("A got (%+v, ok=%v), want the routed signal", m, ok)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("A received nothing — it was evicted while idle but responsive")
	}
}

func TestFpRoutesSignalByFingerprint(t *testing.T) {
	url := fpServerURL(t)
	a := newDevice(t)
	b := newDevice(t)
	ca := register(t, url, a)
	defer ca.CloseNow()
	cb := register(t, url, b)
	defer cb.CloseNow()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// A sends a signal blob addressed to B's fingerprint.
	if err := wsjson.Write(ctx, ca, FpMsg{Type: fpSignal, To: b.fingerprint(), Blob: []byte("signed-offer")}); err != nil {
		t.Fatalf("send: %v", err)
	}
	var got FpMsg
	if err := wsjson.Read(ctx, cb, &got); err != nil {
		t.Fatalf("recv: %v", err)
	}
	if got.Type != fpSignal || string(got.Blob) != "signed-offer" {
		t.Fatalf("b got %+v", got)
	}
}

func TestFpUnreachableWhenTargetOffline(t *testing.T) {
	url := fpServerURL(t)
	a := newDevice(t)
	ca := register(t, url, a)
	defer ca.CloseNow()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := wsjson.Write(ctx, ca, FpMsg{Type: fpSignal, To: "deadbeef", Blob: []byte("x")}); err != nil {
		t.Fatalf("send: %v", err)
	}
	var got FpMsg
	if err := wsjson.Read(ctx, ca, &got); err != nil || got.Type != fpUnreachable {
		t.Fatalf("got (%+v, %v), want unreachable", got, err)
	}
}

func TestFpRejectsBadRegistration(t *testing.T) {
	url := fpServerURL(t)
	a := newDevice(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.CloseNow()
	// Valid key, but a signature over the wrong message.
	bad := FpMsg{Type: fpRegister, Key: a.encodedKey(), Sig: ed25519.Sign(a.priv, []byte("not-the-register-msg"))}
	if err := wsjson.Write(ctx, conn, bad); err != nil {
		t.Fatalf("write: %v", err)
	}
	var ack FpMsg
	// The broker closes the connection; the read must not yield an ok.
	if err := wsjson.Read(ctx, conn, &ack); err == nil && ack.Type == fpOK {
		t.Fatalf("bad registration was accepted")
	}
}
