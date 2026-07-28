package broker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"floppy/internal/pairing"
)

const (
	// pingInterval keeps the connection alive through idle-connection reapers
	// (Railway's edge, load balancers, NAT). It must be well under the shortest
	// such timeout, which is typically 60s.
	pingInterval = 20 * time.Second
	// maxBackoff caps the reconnect wait after repeated failures.
	maxBackoff = 30 * time.Second
)

// ErrNotConnected is returned by Send when the client currently has no live
// connection to the broker (mid-reconnect). The caller surfaces it; the next
// attempt after reconnect succeeds.
var ErrNotConnected = errors.New("broker: not connected")

// Client is a device's self-healing connection to the broker. It registers on
// dial, keeps the socket alive with pings, and transparently reconnects (with
// backoff) if it drops — so a device that sat idle can still send. Delivered
// offers and unreachable notices arrive on Signals for the client's whole life;
// the channel closes only on Close.
type Client struct {
	url string
	id  *pairing.Identity

	signals chan pairing.Signal
	ctx     context.Context
	cancel  context.CancelFunc

	mu   sync.Mutex      // guards conn
	conn *websocket.Conn // current live connection, nil while reconnecting
	wmu  sync.Mutex      // serializes data writes (coder/websocket forbids concurrent Write)
}

// Dial connects to the broker at url (ws://…/ws or wss://…/ws) and registers id.
// The first connection is established synchronously so an unreachable broker is
// reported here; after that the client reconnects on its own until Close.
func Dial(ctx context.Context, url string, id *pairing.Identity) (*Client, error) {
	conn, err := connectOnce(ctx, url, id)
	if err != nil {
		return nil, err
	}
	c := &Client{url: url, id: id, signals: make(chan pairing.Signal, 8)}
	c.ctx, c.cancel = context.WithCancel(context.Background())
	c.conn = conn
	go c.run(conn)
	return c, nil
}

// connectOnce performs a single dial + registration handshake.
func connectOnce(ctx context.Context, url string, id *pairing.Identity) (*websocket.Conn, error) {
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		return nil, fmt.Errorf("broker: dial: %w", err)
	}
	reg := Msg{Type: MsgRegister, PubKey: id.Public(), Sig: id.SignRegister()}
	if err := wsjson.Write(ctx, conn, reg); err != nil {
		conn.CloseNow()
		return nil, fmt.Errorf("broker: register: %w", err)
	}
	var ack Msg
	if err := wsjson.Read(ctx, conn, &ack); err != nil {
		conn.CloseNow()
		return nil, fmt.Errorf("broker: register ack: %w", err)
	}
	if ack.Type != MsgOK {
		conn.CloseNow()
		return nil, fmt.Errorf("broker: registration refused (%s)", ack.Type)
	}
	return conn, nil
}

// run services one connection until it dies, then reconnects — repeating until
// Close cancels the client. It owns the Signals channel and closes it on exit.
func (c *Client) run(conn *websocket.Conn) {
	defer close(c.signals)
	for {
		c.serve(conn)
		if c.ctx.Err() != nil {
			return // Close was called
		}
		c.setConn(nil)
		conn = c.reconnect()
		if conn == nil {
			return // ctx cancelled during backoff
		}
		c.setConn(conn)
	}
}

// serve runs the read loop and a pinger for one connection, returning when the
// connection fails or the client is closed.
func (c *Client) serve(conn *websocket.Conn) {
	ctx, cancel := context.WithCancel(c.ctx)
	defer cancel()
	go c.pinger(ctx, conn)

	for {
		var m Msg
		if err := wsjson.Read(ctx, conn, &m); err != nil {
			return
		}
		var sig pairing.Signal
		switch m.Type {
		case MsgOffer:
			if err := json.Unmarshal(m.Blob, &sig); err != nil {
				slog.Warn("broker client: undecodable signal", "err", err)
				continue
			}
		case MsgUnreachable:
			sig = pairing.Signal{Kind: pairing.SignalUnreachable, To: m.To}
		default:
			continue
		}
		select {
		case c.signals <- sig:
		case <-ctx.Done():
			return
		}
	}
}

// pinger keeps the connection alive; a failed ping tears the connection down so
// serve returns and run reconnects.
func (c *Client) pinger(ctx context.Context, conn *websocket.Conn) {
	t := time.NewTicker(pingInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			pctx, cancel := context.WithTimeout(ctx, 10*time.Second)
			err := conn.Ping(pctx)
			cancel()
			if err != nil {
				conn.CloseNow()
				return
			}
		}
	}
}

// reconnect redials with exponential backoff until it succeeds or the client is
// closed (returns nil).
func (c *Client) reconnect() *websocket.Conn {
	backoff := time.Second
	for {
		select {
		case <-c.ctx.Done():
			return nil
		case <-time.After(backoff):
		}
		conn, err := connectOnce(c.ctx, c.url, c.id)
		if err == nil {
			slog.Info("broker: reconnected")
			return conn
		}
		slog.Warn("broker: reconnect failed, retrying", "err", err, "in", backoff)
		if backoff *= 2; backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

// Send delivers a signal to the device with the given fingerprint. Fire and
// forget: an offline target comes back later as an unreachable Signal. Returns
// ErrNotConnected if the client is mid-reconnect.
func (c *Client) Send(to string, sig pairing.Signal) error {
	blob, err := json.Marshal(sig)
	if err != nil {
		return fmt.Errorf("broker: marshal signal: %w", err)
	}
	c.mu.Lock()
	conn := c.conn
	c.mu.Unlock()
	if conn == nil {
		return ErrNotConnected
	}
	c.wmu.Lock()
	defer c.wmu.Unlock()
	return wsjson.Write(c.ctx, conn, Msg{Type: MsgOffer, To: to, Blob: blob})
}

// Signals is the stream of incoming signals; closed when the client is closed.
func (c *Client) Signals() <-chan pairing.Signal { return c.signals }

// Close tears down the client and its connection; run closes the Signals channel.
func (c *Client) Close() error {
	c.cancel()
	c.mu.Lock()
	conn := c.conn
	c.mu.Unlock()
	if conn != nil {
		conn.CloseNow()
	}
	return nil
}

func (c *Client) setConn(conn *websocket.Conn) {
	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()
}
