// Package main is floppy's rendezvous broker: a standalone, dumb WebSocket
// relay. This build serves the code-mailbox mode for quick share — two parties
// that join the same code-derived room have their handshake messages relayed to
// each other as opaque blobs. The broker never inspects, decrypts, or persists
// a message; the SPAKE2 key and the iroh ticket stay end-to-end between the two
// clients (see the code-phrase-share + rendezvous-broker specs).
//
// The fingerprint-routing mode for trusted devices is a separate, additive mode
// added when device pairing is ported (slice 4); it shares this binary but not
// this file.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

// Wire message types for the mailbox mode. One JSON envelope both directions.
const (
	msgJoin = "join" // client → broker: join a room (first message)
	msgRelay = "msg" // both ways: an opaque handshake blob to relay
	msgFull  = "full" // broker → client: the room already has two parties
)

// Msg is the mailbox wire envelope. `Data` is opaque handshake bytes; JSON
// encodes it as standard base64 (the Rust client decodes the same).
type Msg struct {
	Type string `json:"type"`
	Room string `json:"room,omitempty"`
	Data []byte `json:"data,omitempty"`
}

// client is one live mailbox connection with a single-writer lock — the socket
// is written by its own read loop (buffered flush) and by its peer's loop
// (relayed blobs), and the websocket forbids concurrent writes.
type client struct {
	conn *websocket.Conn
	wmu  sync.Mutex
}

func (c *client) send(ctx context.Context, m Msg) error {
	c.wmu.Lock()
	defer c.wmu.Unlock()
	return wsjson.Write(ctx, c.conn, m)
}

// room holds the (at most two) parties of one rendezvous plus any blobs sent
// before the second party arrived, so SPAKE2's first message is not lost to a
// race on who connects first.
type room struct {
	clients  []*client
	buffered [][]byte
}

// Server relays mailbox handshakes between paired clients. Construct with New.
type Server struct {
	mu    sync.Mutex
	rooms map[string]*room
	// Keepalive cadence; seeded from the defaults, overridable in tests.
	pingInterval time.Duration
	pingTimeout  time.Duration
}

func New() *Server {
	return &Server{
		rooms:        make(map[string]*room),
		pingInterval: defaultPingInterval,
		pingTimeout:  defaultPingTimeout,
	}
}

func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(s.serve)
}

func (s *Server) serve(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return // Accept already wrote the response
	}
	defer conn.CloseNow()
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	go keepalive(ctx, cancel, conn, s.pingInterval, s.pingTimeout)

	// First message must be a join naming a non-empty room.
	var join Msg
	if err := wsjson.Read(ctx, conn, &join); err != nil {
		return
	}
	if join.Type != msgJoin || join.Room == "" {
		_ = conn.Close(websocket.StatusPolicyViolation, "expected join")
		return
	}

	cl := &client{conn: conn}
	buffered, ok := s.join(join.Room, cl)
	if !ok {
		_ = cl.send(ctx, Msg{Type: msgFull})
		_ = conn.Close(websocket.StatusPolicyViolation, "room full")
		return
	}
	defer s.leave(join.Room, cl)
	slog.Info("broker: joined mailbox", "room", join.Room)

	// Deliver anything the first party sent before we arrived.
	for _, b := range buffered {
		if err := cl.send(ctx, Msg{Type: msgRelay, Data: b}); err != nil {
			return
		}
	}

	for {
		var m Msg
		if err := wsjson.Read(ctx, conn, &m); err != nil {
			return
		}
		if m.Type == msgRelay {
			s.relay(ctx, join.Room, cl, m.Data)
		}
		// Unknown types are ignored — a dumb relay does not police them.
	}
}

// join adds cl to a room, returning the blobs it should receive (those the
// earlier party already sent) and whether the room had space. The room holds at
// most two parties.
func (s *Server) join(id string, cl *client) (buffered [][]byte, ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rm := s.rooms[id]
	if rm == nil {
		rm = &room{}
		s.rooms[id] = rm
	}
	if len(rm.clients) >= 2 {
		return nil, false
	}
	// The second party drains the buffer; the first joins to an empty one.
	buffered = rm.buffered
	rm.buffered = nil
	rm.clients = append(rm.clients, cl)
	return buffered, true
}

// relay forwards data to the other party in the room, or buffers it if the peer
// has not joined yet. The bytes are never inspected.
func (s *Server) relay(ctx context.Context, id string, from *client, data []byte) {
	s.mu.Lock()
	rm := s.rooms[id]
	var peer *client
	if rm != nil {
		for _, c := range rm.clients {
			if c != from {
				peer = c
			}
		}
		if peer == nil {
			// No peer yet — hold it for whoever joins next.
			rm.buffered = append(rm.buffered, data)
		}
	}
	s.mu.Unlock()

	if peer != nil {
		// Sent outside the lock: a slow peer write must not stall the room.
		_ = peer.send(ctx, Msg{Type: msgRelay, Data: data})
	}
}

func (s *Server) leave(id string, cl *client) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rm := s.rooms[id]
	if rm == nil {
		return
	}
	for i, c := range rm.clients {
		if c == cl {
			rm.clients = append(rm.clients[:i], rm.clients[i+1:]...)
			break
		}
	}
	if len(rm.clients) == 0 {
		delete(s.rooms, id)
	}
}
