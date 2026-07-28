package broker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"floppy/internal/pairing"
)

// Client is a device's connection to the broker. It registers on dial, then
// runs a read loop that turns delivered offers and unreachable notices into
// pairing.Signals on the Signals channel. Safe for concurrent Send.
type Client struct {
	conn    *websocket.Conn
	signals chan pairing.Signal

	wmu sync.Mutex // coder/websocket forbids concurrent writes

	closeOnce sync.Once
}

// Dial connects to the broker at url (ws://…/ws), registers id, and starts the
// read loop. The context governs only the dial + registration handshake; the
// connection outlives it until Close.
func Dial(ctx context.Context, url string, id *pairing.Identity) (*Client, error) {
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
	c := &Client{conn: conn, signals: make(chan pairing.Signal, 8)}
	go c.readLoop()
	return c, nil
}

// Send delivers a signal to the device with the given fingerprint. Fire and
// forget: an offline target comes back later as an unreachable Signal, not an
// error here.
func (c *Client) Send(to string, sig pairing.Signal) error {
	blob, err := json.Marshal(sig)
	if err != nil {
		return fmt.Errorf("broker: marshal signal: %w", err)
	}
	c.wmu.Lock()
	defer c.wmu.Unlock()
	return wsjson.Write(context.Background(), c.conn, Msg{Type: MsgOffer, To: to, Blob: blob})
}

// Signals is the stream of incoming signals (offers, responses, unreachable
// notices). Closed when the connection ends.
func (c *Client) Signals() <-chan pairing.Signal { return c.signals }

// Close tears down the connection; the read loop closes the Signals channel.
func (c *Client) Close() error {
	c.closeOnce.Do(func() { c.conn.CloseNow() })
	return nil
}

func (c *Client) readLoop() {
	defer close(c.signals)
	for {
		var m Msg
		if err := wsjson.Read(context.Background(), c.conn, &m); err != nil {
			return
		}
		switch m.Type {
		case MsgOffer:
			var sig pairing.Signal
			if err := json.Unmarshal(m.Blob, &sig); err != nil {
				slog.Warn("broker client: undecodable signal", "err", err)
				continue
			}
			c.signals <- sig
		case MsgUnreachable:
			c.signals <- pairing.Signal{Kind: pairing.SignalUnreachable, To: m.To}
		}
	}
}
