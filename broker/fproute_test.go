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
