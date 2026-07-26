//go:build race

package transfer

// raceEnabled reports whether this test binary was built with -race. Tests
// that pair the live croc poller with a live croc client skip under the race
// detector — that pairing is a deliberate, documented data race (see the
// RACE FENCE comment on crocPeer.Snapshot) and is covered by the plain
// `go test ./...` run instead.
const raceEnabled = true
