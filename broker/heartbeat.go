// WebSocket keepalive shared by both broker modes. The read loops block on
// wsjson.Read with no deadline, so a silently-dropped socket (a NAT or proxy
// that quietly closed an idle connection) would sit there registered until the
// next write failed. A per-connection ping/pong heartbeat keeps an idle-but-live
// connection warm and evicts a dead one promptly.

package main

import (
	"context"
	"time"

	"github.com/coder/websocket"
)

// Defaults for the keepalive. An idle connection is pinged every
// defaultPingInterval; if a pong does not return within defaultPingTimeout the
// connection is treated as dead and closed. Kept well under common NAT/proxy
// idle timeouts so a device that sat idle stays reachable. Tests override the
// per-server fields these seed.
const (
	defaultPingInterval = 30 * time.Second
	defaultPingTimeout  = 10 * time.Second
)

// keepalive pings conn every interval and closes it (cancelling ctx) if a pong
// does not arrive within timeout, so an idle-but-live connection stays connected
// and a silently-dropped one is evicted rather than relayed into. It returns
// when ctx is done. A peer only needs to keep reading its socket; its WebSocket
// library answers the pings automatically.
func keepalive(ctx context.Context, cancel context.CancelFunc, conn *websocket.Conn, interval, timeout time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			pctx, pcancel := context.WithTimeout(ctx, timeout)
			err := conn.Ping(pctx)
			pcancel()
			if err != nil {
				_ = conn.Close(websocket.StatusGoingAway, "heartbeat timeout")
				cancel()
				return
			}
		}
	}
}
