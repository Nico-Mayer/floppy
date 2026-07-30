// Fingerprint-routing mode for trusted devices: a device registers under its
// fingerprint (proving ownership with a signature) and the broker relays signed
// signal blobs from one device to another by fingerprint. Additive and fully
// isolated from the code-mailbox mode — different WS path, different registry.
// The broker never inspects a signal blob beyond its routing header.

package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const (
	fpRegister    = "register"    // client → broker: claim a fingerprint slot
	fpSignal      = "signal"      // both ways: an opaque signed signal blob
	fpOK          = "ok"          // broker → client: registration accepted
	fpUnreachable = "unreachable" // broker → sender: target not connected
)

// FpMsg is the fingerprint-mode envelope. `Key`/`Sig` register; `To`/`Blob`
// route a signal. `Blob` is opaque base64 — the broker never parses it.
type FpMsg struct {
	Type string `json:"type"`
	Key  string `json:"key,omitempty"`  // register: base64url(sign‖kex)
	Sig  []byte `json:"sig,omitempty"`  // register proof
	To   string `json:"to,omitempty"`   // signal: target fingerprint
	Blob []byte `json:"blob,omitempty"` // signal: opaque signed blob
}

type fpClient struct {
	fp   string
	conn *websocket.Conn
	wmu  sync.Mutex
}

func (c *fpClient) send(ctx context.Context, m FpMsg) error {
	c.wmu.Lock()
	defer c.wmu.Unlock()
	return wsjson.Write(ctx, c.conn, m)
}

// FpServer routes signals between connected devices keyed by fingerprint.
type FpServer struct {
	mu      sync.RWMutex
	clients map[string]*fpClient
}

func NewFpServer() *FpServer {
	return &FpServer{clients: make(map[string]*fpClient)}
}

func (s *FpServer) Handler() http.Handler {
	return http.HandlerFunc(s.serve)
}

func (s *FpServer) serve(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer conn.CloseNow()
	ctx := r.Context()

	// First message must be a valid registration.
	var reg FpMsg
	if err := wsjson.Read(ctx, conn, &reg); err != nil {
		return
	}
	pk, ok := decodePubKey(reg.Key)
	if reg.Type != fpRegister || !ok || !verifyRegister(pk, reg.Sig) {
		slog.Warn("broker(fp): rejected registration")
		_ = conn.Close(websocket.StatusPolicyViolation, "bad registration")
		return
	}
	cl := &fpClient{fp: pk.fingerprint(), conn: conn}
	s.add(cl)
	defer s.remove(cl)
	if err := cl.send(ctx, FpMsg{Type: fpOK}); err != nil {
		return
	}
	slog.Info("broker(fp): registered", "fp", cl.fp[:8])

	for {
		var m FpMsg
		if err := wsjson.Read(ctx, conn, &m); err != nil {
			if !errors.Is(err, context.Canceled) {
				slog.Debug("broker(fp): disconnected", "fp", cl.fp[:8])
			}
			return
		}
		if m.Type == fpSignal {
			s.route(ctx, cl, m)
		}
	}
}

// route forwards a signal to its target, or reports the target offline. The
// blob is never parsed.
func (s *FpServer) route(ctx context.Context, from *fpClient, m FpMsg) {
	s.mu.RLock()
	target := s.clients[m.To]
	s.mu.RUnlock()
	if target == nil {
		_ = from.send(ctx, FpMsg{Type: fpUnreachable, To: m.To})
		return
	}
	if err := target.send(ctx, FpMsg{Type: fpSignal, Blob: m.Blob}); err != nil {
		_ = from.send(ctx, FpMsg{Type: fpUnreachable, To: m.To})
	}
}

func (s *FpServer) add(cl *fpClient) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if old, ok := s.clients[cl.fp]; ok {
		old.conn.CloseNow() // last registration wins
	}
	s.clients[cl.fp] = cl
}

func (s *FpServer) remove(cl *fpClient) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.clients[cl.fp] == cl {
		delete(s.clients, cl.fp)
	}
}
