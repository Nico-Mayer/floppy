package transfer

import "time"

// RelayConfig selects the croc relay. The zero value means croc's public
// relay — the right default for the app; tests point it at an in-process
// relay to stay off the network.
type RelayConfig struct {
	// Address / Address6 override the IPv4/IPv6 relay. Setting Address alone
	// also clears the default IPv6 relay: a private relay should never race
	// against the public one.
	Address  string
	Address6 string
	// Password authenticates against a self-hosted relay; empty = croc's
	// public default.
	Password string
	// DisableLocal turns off LAN peer discovery and the sender's ephemeral
	// local relay, forcing all traffic through the configured relay. Used by
	// tests for determinism; the app leaves it off so same-network transfers
	// bypass the relay entirely.
	DisableLocal bool
}

// Config configures a Manager.
type Config struct {
	// DestRoot is where receives land, one subfolder per code phrase.
	// Required. The Manager parks the process working directory here — croc
	// saves into the CWD, and the Manager is the only component allowed to
	// move it (see Manager docs).
	DestRoot string

	Relay RelayConfig

	// Emit receives every Event. Required. See Emitter for the contract.
	Emit Emitter

	// PollInterval / StatsInterval override the progress cadence; zero means
	// the defaults (200ms poll, 1s forced re-emit). Tests shorten them.
	PollInterval  time.Duration
	StatsInterval time.Duration
}

// SendOptions parameterizes a send.
type SendOptions struct {
	// Code is the code phrase to offer the peer; empty means a random one.
	// Custom codes must be at least 6 characters after normalization
	// (croc's minimum). Caveat inherited from croc: the relay room is
	// derived from the first 4 characters, so two simultaneous transfers
	// whose codes share a 4-character prefix will collide on the relay —
	// random codes get distinct numeric prefixes for this reason.
	Code string
}

// ReceiveOptions parameterizes a receive. Empty today; it exists so adding
// options later (destination override, auto-accept policy) is not a
// signature change.
type ReceiveOptions struct{}
