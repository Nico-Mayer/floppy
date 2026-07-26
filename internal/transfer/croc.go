package transfer

import (
	"context"
	"strings"

	"github.com/schollz/croc/v10/src/croc"
	"github.com/schollz/croc/v10/src/models"
)

// This file is the only place that touches the croc library. Everything the
// rest of the package needs from croc goes through the peer interface, so
// tests can substitute a fake and the croc-version-specific knowledge stays
// in one spot.

// minCodeLen is croc's own minimum (croc.New rejects shorter secrets; the
// first 4 characters become the relay room, the rest feed the PAKE).
const minCodeLen = 6

// normalizeCode turns "1234 word word" into "1234-word-word", the way the
// croc CLI treats pasted codes. Applied to received codes and custom send
// codes alike.
func normalizeCode(code string) string {
	return strings.Join(strings.Fields(code), "-")
}

// CrocOptions is the one place croc client options are built — the app and
// the croctool test peer share it so the two endpoints can never drift apart.
// DisableClipboard is deliberate: croc's Send copies the code phrase into the
// system clipboard via pbcopy/clip/wl-copy, which for an app that has its own
// copy button is a silent clipboard overwrite.
func CrocOptions(isSender bool, secret string, relay RelayConfig) croc.Options {
	o := croc.Options{
		IsSender:         isSender,
		SharedSecret:     secret,
		RelayAddress:     models.DEFAULT_RELAY,
		RelayAddress6:    models.DEFAULT_RELAY6,
		RelayPassword:    models.DEFAULT_PASSPHRASE,
		RelayPorts:       []string{"9009", "9010", "9011", "9012", "9013"},
		Curve:            "p256",
		HashAlgorithm:    "xxhash",
		MulticastAddress: "239.255.255.250",
		NoPrompt:         true,
		IgnoreStdin:      true,
		Overwrite:        true,
		DisableClipboard: true,
		DisableLocal:     relay.DisableLocal,
	}
	if relay.Address != "" {
		o.RelayAddress = relay.Address
		// A configured relay must not race croc's public IPv6 relay for the
		// connection; only use v6 when explicitly given.
		o.RelayAddress6 = relay.Address6
	}
	if relay.Password != "" {
		o.RelayPassword = relay.Password
	}
	return o
}

// peer is one croc endpoint: Run performs the whole transfer (blocking),
// Snapshot reports its progress. The indirection exists for exactly one
// reason: unit tests substitute a fake so the state machine and poller are
// testable without a network or croc's goroutines.
type peer interface {
	Run() error
	Snapshot() (snap, bool)
}

// peerRequest is what the Manager knows when it asks for a peer.
type peerRequest struct {
	kind   Kind
	secret string
	paths  []string // send only
}

type peerFactory func(ctx context.Context, req peerRequest) (peer, error)

// crocPeer wraps a croc client. The context handed to the factory governs
// the transfer: cancelling it makes croc abort and tell the remote peer.
type crocPeer struct {
	client       *croc.Client
	files        []croc.FileInfo
	emptyFolders []croc.FileInfo
	totalFolders int
}

func newCrocPeerFactory(relay RelayConfig) peerFactory {
	return func(ctx context.Context, req peerRequest) (peer, error) {
		client, err := croc.NewCtx(ctx, CrocOptions(req.kind == KindSend, req.secret, relay))
		if err != nil {
			return nil, err
		}
		p := &crocPeer{client: client}
		if req.kind == KindSend {
			p.files, p.emptyFolders, p.totalFolders, err = croc.GetFilesInfo(req.paths, false, false, nil)
			if err != nil {
				return nil, err
			}
		}
		return p, nil
	}
}

func (p *crocPeer) Run() error {
	if p.client.Options.IsSender {
		return p.client.Send(p.files, p.emptyFolders, p.totalFolders)
	}
	return p.client.Receive()
}

// snap is what one Snapshot of a peer's counters yields.
type snap struct {
	done, total int64
	// file is the name of the file being moved now, index its 1-based place
	// among count files.
	file         string
	index, count int
}

// Snapshot derives overall progress: the sizes of the files already done
// (croc transfers them in order) plus the byte counter of the current one,
// which croc resets per file. For a sender it reports false until the
// transfer step has actually started (Step4 is only set on the sending
// side), so a sender still waiting for its receiver emits nothing — the
// frontend relies on the first progress event to switch from "waiting" to
// "sending". A receiver has no file list until the handshake, so the length
// check below already keeps it quiet before the transfer.
//
// RACE FENCE — this method is a deliberate, documented data race and the
// only one in the package. croc has no progress API; its transfer goroutines
// write these plain fields while we read them. Torn or stale values cost one
// progress tick, nothing else, and croc's maps are never touched (concurrent
// map reads can crash; struct/slice field reads cannot be made to). Under
// `go test -race` every test that pairs this method with a live croc client
// skips itself — see skipIfRace — and the pairing is covered by the non-race
// run instead. Do not add reads of croc internals anywhere else.
func (p *crocPeer) Snapshot() (s snap, ok bool) {
	c := p.client
	if c.Options.IsSender && !c.Step4FileTransferred {
		return snap{}, false
	}
	files := c.FilesToTransfer
	if len(files) == 0 {
		return snap{}, false
	}
	for _, f := range files {
		s.total += f.Size
	}
	if s.total <= 0 {
		return snap{}, false
	}
	idx := c.FilesToTransferCurrentNum
	s.count = len(files)
	s.index = min(idx+1, s.count)
	s.file = files[s.index-1].Name
	done := int64(0)
	for i := 0; i < idx && i < len(files); i++ {
		done += files[i].Size
	}
	if idx < len(files) {
		// On a resumed transfer croc only moves the chunks the receiver is
		// missing (CurrentFileChunks) and TotalSent counts just those bytes.
		// Credit the part the receiver already has — same accounting as
		// croc's own progress bar (setBar) — or a resume sits at 0% while it
		// finishes.
		credit := int64(0)
		if n := int64(len(c.CurrentFileChunks)); n > 0 {
			credit = max(files[idx].Size-n*models.TCP_BUFFER_SIZE/2, 0)
		}
		if sent := min(credit+c.TotalSent, files[idx].Size); sent > 0 {
			done += sent
		}
	}
	s.done = min(done, s.total)
	return s, true
}
