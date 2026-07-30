package main

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

// dial opens a mailbox connection and joins the given room.
func dial(t *testing.T, url, room string) *websocket.Conn {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	if err := wsjson.Write(ctx, conn, Msg{Type: msgJoin, Room: room}); err != nil {
		t.Fatalf("join: %v", err)
	}
	return conn
}

func send(t *testing.T, conn *websocket.Conn, data []byte) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := wsjson.Write(ctx, conn, Msg{Type: msgRelay, Data: data}); err != nil {
		t.Fatalf("send: %v", err)
	}
}

// recv reads one relayed blob, failing if none arrives promptly.
func recv(t *testing.T, conn *websocket.Conn) Msg {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var m Msg
	if err := wsjson.Read(ctx, conn, &m); err != nil {
		t.Fatalf("recv: %v", err)
	}
	return m
}

func testServer(t *testing.T) string {
	t.Helper()
	ts := httptest.NewServer(New().Handler())
	t.Cleanup(ts.Close)
	return "ws" + strings.TrimPrefix(ts.URL, "http") + "/ws"
}

// mailboxURLFast is testServer with a fast keepalive so eviction is testable in
// milliseconds.
func mailboxURLFast(t *testing.T, interval, timeout time.Duration) string {
	t.Helper()
	s := New()
	s.pingInterval = interval
	s.pingTimeout = timeout
	ts := httptest.NewServer(s.Handler())
	t.Cleanup(ts.Close)
	return "ws" + strings.TrimPrefix(ts.URL, "http") + "/ws"
}

// A party that joins a room then goes silent is evicted by the heartbeat,
// freeing the room slot so two fresh parties can still pair there.
func TestMailboxKeepaliveEvictsSilentJoiner(t *testing.T) {
	url := mailboxURLFast(t, 50*time.Millisecond, 50*time.Millisecond)
	// One silent joiner takes a slot in the room, then stops responding.
	c1 := dial(t, url, "room-z")
	defer c1.CloseNow()

	time.Sleep(300 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	start := time.Now()
	if _, _, err := c1.Read(ctx); err == nil {
		t.Fatal("expected the silent joiner to be closed by the heartbeat")
	} else if time.Since(start) > time.Second {
		t.Fatalf("read did not return promptly (%v) — joiner was not evicted", time.Since(start))
	}

	// The room slot is free again: two fresh parties pair without hitting "full".
	a := dial(t, url, "room-z")
	defer a.CloseNow()
	b := dial(t, url, "room-z")
	defer b.CloseNow()
	send(t, a, []byte("after-eviction"))
	if got := recv(t, b); string(got.Data) != "after-eviction" {
		t.Fatalf("b got %q, want the room reusable after eviction", got.Data)
	}
}

func TestMailboxRelaysBothDirections(t *testing.T) {
	url := testServer(t)
	a := dial(t, url, "7-crayon-mimic")
	defer a.CloseNow()
	b := dial(t, url, "7-crayon-mimic")
	defer b.CloseNow()

	send(t, a, []byte("hello-from-a"))
	if got := recv(t, b); string(got.Data) != "hello-from-a" {
		t.Fatalf("b got %q", got.Data)
	}
	send(t, b, []byte("hello-from-b"))
	if got := recv(t, a); string(got.Data) != "hello-from-b" {
		t.Fatalf("a got %q", got.Data)
	}
}

func TestMailboxBuffersUntilPeerJoins(t *testing.T) {
	url := testServer(t)
	// A joins and sends before B is present; the blob must wait for B.
	a := dial(t, url, "room-1")
	defer a.CloseNow()
	send(t, a, []byte("early"))

	b := dial(t, url, "room-1")
	defer b.CloseNow()
	if got := recv(t, b); string(got.Data) != "early" {
		t.Fatalf("b got %q, want buffered 'early'", got.Data)
	}
}

func TestMailboxRoomsAreIsolated(t *testing.T) {
	url := testServer(t)
	a := dial(t, url, "room-a")
	defer a.CloseNow()
	b := dial(t, url, "room-b")
	defer b.CloseNow()

	send(t, a, []byte("secret"))
	// b is in a different room and must never receive a's blob: the read times
	// out with nothing delivered.
	ctx, cancel := context.WithTimeout(context.Background(), 400*time.Millisecond)
	defer cancel()
	var m Msg
	if err := wsjson.Read(ctx, b, &m); err == nil {
		t.Fatalf("b received a cross-room message: %q", m.Data)
	}
}

func TestMailboxThirdPartyRejected(t *testing.T) {
	url := testServer(t)
	a := dial(t, url, "full-room")
	defer a.CloseNow()
	b := dial(t, url, "full-room")
	defer b.CloseNow()

	// A third join to the same room is told the room is full, then closed.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial c: %v", err)
	}
	defer c.CloseNow()
	if err := wsjson.Write(ctx, c, Msg{Type: msgJoin, Room: "full-room"}); err != nil {
		t.Fatalf("join c: %v", err)
	}
	var m Msg
	if err := wsjson.Read(ctx, c, &m); err != nil || m.Type != msgFull {
		t.Fatalf("third party: got (%+v, %v), want type=full", m, err)
	}
}
