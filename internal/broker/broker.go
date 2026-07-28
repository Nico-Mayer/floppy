// Package broker is the trusted-device rendezvous: a dumb WebSocket relay that
// routes signed offers from one device to another by fingerprint. It has no
// accounts, no database, and never inspects an offer beyond its routing header
// — the offer blob is forwarded verbatim. This is the desktop-first slice; the
// push provider (APNs/FCM) that wakes a closed mobile app is a later, additive
// layer on the same routing contract.
package broker

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"floppy/internal/pairing"
)

// Message types on the wire. Kept as string constants so the client and broker
// share one vocabulary.
const (
	MsgRegister    = "register"    // client → broker: claim a fingerprint's routing slot
	MsgOffer       = "offer"       // both directions: send-offer / delivered-offer
	MsgOK          = "ok"          // broker → client: registration accepted
	MsgUnreachable = "unreachable" // broker → sender: target not connected
)

// Msg is the single envelope for every broker exchange. Unused fields are
// omitted per direction — a register carries PubKey+Sig, an offer carries
// To+Blob, and so on.
type Msg struct {
	Type   string            `json:"type"`
	PubKey pairing.PublicKey `json:"pubkey,omitzero"` // register
	Sig    []byte            `json:"sig,omitempty"`    // register proof
	To     string            `json:"to,omitempty"`     // offer: target fingerprint
	Blob   json.RawMessage   `json:"blob,omitempty"`   // offer: opaque signed offer
}

// Server routes offers between connected clients keyed by fingerprint. The zero
// value is not usable; construct with New.
type Server struct {
	mu      sync.RWMutex
	clients map[string]*client
}

// New creates an empty broker.
func New() *Server {
	return &Server{clients: make(map[string]*client)}
}

// client is one live connection with a single-writer lock — coder/websocket
// forbids concurrent writes, and a client's socket is written both by its own
// read loop (ok / unreachable) and by other clients' loops (delivered offers).
type client struct {
	fp   string
	conn *websocket.Conn
	wmu  sync.Mutex
}

func (c *client) send(ctx context.Context, m Msg) error {
	c.wmu.Lock()
	defer c.wmu.Unlock()
	return wsjson.Write(ctx, c.conn, m)
}

// Handler returns the HTTP handler that upgrades to WebSocket and serves one
// client for the life of the connection.
func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(s.serve)
}

func (s *Server) serve(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return // Accept already wrote the error response
	}
	// CloseNow is the unconditional teardown; a clean Close on the happy path
	// is best-effort and not worth the extra choreography for a relay.
	defer conn.CloseNow()
	ctx := r.Context()

	// First message must be a valid registration; anything else drops the conn.
	var reg Msg
	if err := wsjson.Read(ctx, conn, &reg); err != nil {
		return
	}
	if reg.Type != MsgRegister || !pairing.VerifyRegister(reg.PubKey, reg.Sig) {
		slog.Warn("broker: rejected registration")
		_ = conn.Close(websocket.StatusPolicyViolation, "bad registration")
		return
	}

	cl := &client{fp: reg.PubKey.Fingerprint(), conn: conn}
	s.add(cl)
	defer s.remove(cl)
	if err := cl.send(ctx, Msg{Type: MsgOK}); err != nil {
		return
	}
	slog.Info("broker: client registered", "fp", cl.fp[:8])

	for {
		var m Msg
		if err := wsjson.Read(ctx, conn, &m); err != nil {
			if !errors.Is(err, context.Canceled) {
				slog.Debug("broker: client disconnected", "fp", cl.fp[:8])
			}
			return
		}
		if m.Type == MsgOffer {
			s.route(ctx, cl, m)
		}
		// Unknown message types are ignored — a dumb relay does not police them.
	}
}

// route forwards an offer to its target, or tells the sender the target is not
// connected. The blob is never parsed here.
func (s *Server) route(ctx context.Context, from *client, m Msg) {
	s.mu.RLock()
	target := s.clients[m.To]
	s.mu.RUnlock()
	if target == nil {
		_ = from.send(ctx, Msg{Type: MsgUnreachable, To: m.To})
		return
	}
	if err := target.send(ctx, Msg{Type: MsgOffer, Blob: m.Blob}); err != nil {
		_ = from.send(ctx, Msg{Type: MsgUnreachable, To: m.To})
	}
}

func (s *Server) add(cl *client) {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Last registration wins; an existing conn for the same fingerprint is
	// dropped so a reconnecting client always takes over its own slot.
	if old, ok := s.clients[cl.fp]; ok {
		old.conn.CloseNow()
	}
	s.clients[cl.fp] = cl
}

func (s *Server) remove(cl *client) {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Only remove the slot if it still points at this connection — a newer
	// registration for the same fingerprint must not be evicted by an older
	// conn's teardown.
	if s.clients[cl.fp] == cl {
		delete(s.clients, cl.fp)
	}
}
