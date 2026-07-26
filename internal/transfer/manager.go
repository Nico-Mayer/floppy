// Package transfer runs croc file transfers in-process: one Manager per app,
// at most one live transfer per direction. It owns the process working
// directory (croc saves into the CWD) and reports everything through a
// caller-supplied Emitter — it knows nothing about Wails or the UI.
package transfer

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/schollz/croc/v10/src/utils"
)

const (
	// defaultCancelGrace bounds how long a new transfer waits for its
	// cancelled predecessor to unwind before giving up; unwinding normally
	// takes a couple of seconds.
	defaultCancelGrace = 20 * time.Second
)

// slot is one live-or-unwinding transfer. Cancelling only asks croc to stop;
// it keeps running for a second or two afterwards, and starting the next
// transfer before it lets go would collide over the relay and (for receives)
// the working directory. done closes when the goroutine has fully unwound
// and its last event is out.
type slot struct {
	id        string
	cancel    context.CancelFunc
	done      chan struct{}
	cancelled bool
}

// Manager runs transfers. Create with New; the zero value is not usable.
type Manager struct {
	destRoot   string
	emit       Emitter
	poll       time.Duration
	statsEvery time.Duration
	// newPeer builds the croc endpoint; unit tests substitute a fake. This
	// is the croc/transport seam.
	newPeer     peerFactory
	cancelGrace time.Duration

	seq atomic.Uint64

	mu    sync.Mutex
	slots [kindCount]*slot
}

// New validates cfg, creates the receive root, and parks the process working
// directory there. The croc library always saves into the CWD; Receive
// re-points it at a per-code subfolder for the duration of each transfer,
// and nothing else in the process may depend on the CWD.
func New(cfg Config) (*Manager, error) {
	if cfg.Emit == nil {
		return nil, fmt.Errorf("transfer: Config.Emit is required")
	}
	if cfg.DestRoot == "" {
		return nil, fmt.Errorf("transfer: Config.DestRoot is required")
	}
	if err := os.MkdirAll(cfg.DestRoot, 0o755); err != nil {
		return nil, fmt.Errorf("transfer: creating receive root: %w", err)
	}
	if err := os.Chdir(cfg.DestRoot); err != nil {
		return nil, fmt.Errorf("transfer: entering receive root: %w", err)
	}
	m := &Manager{
		destRoot:    cfg.DestRoot,
		emit:        cfg.Emit,
		poll:        cfg.PollInterval,
		statsEvery:  cfg.StatsInterval,
		newPeer:     newCrocPeerFactory(cfg.Relay),
		cancelGrace: defaultCancelGrace,
	}
	if m.poll <= 0 {
		m.poll = defaultPollInterval
	}
	if m.statsEvery <= 0 {
		m.statsEvery = defaultStatsInterval
	}
	return m, nil
}

// Send starts a send transfer for the given paths and returns its transfer
// ID immediately. The code phrase is emitted as EventCode, then progress,
// then EventDone or EventFailed. A cancelled send emits nothing further.
func (m *Manager) Send(paths []string, opts SendOptions) (string, error) {
	if len(paths) == 0 {
		return "", ErrNoFiles
	}
	secret := normalizeCode(opts.Code)
	if secret == "" {
		secret = utils.GetRandomName()
	} else if len(secret) < minCodeLen {
		return "", fmt.Errorf("%w: need at least %d characters", ErrBadCode, minCodeLen)
	}

	if err := m.awaitFreeSlot(KindSend); err != nil {
		return "", err
	}

	m.mu.Lock()
	if m.slots[KindSend] != nil {
		m.mu.Unlock()
		return "", fmt.Errorf("%w: cancel the current send first", ErrBusy)
	}
	ctx, cancel := context.WithCancel(context.Background())
	p, err := m.newPeer(ctx, peerRequest{kind: KindSend, secret: secret, paths: paths})
	if err != nil {
		cancel()
		m.mu.Unlock()
		return "", err
	}
	sl := m.claimLocked(KindSend, cancel)
	m.mu.Unlock()

	slog.Info("croc send: starting", "id", sl.id, "files", len(paths))
	// Everything validated — hand out the code phrase; the frontend treats
	// it as "waiting for receiver".
	m.emit(Event{ID: sl.id, Kind: KindSend, Type: EventCode, Code: secret})
	stopped := m.watch(ctx, sl, KindSend, p)
	go m.run(KindSend, sl, p, cancel, stopped, "")
	return sl.id, nil
}

// Receive starts a receive transfer for the given code phrase and returns
// its transfer ID immediately. Files are saved to DestRoot/<code>/ — repeats
// of a code resume into the same folder, different transfers never collide.
// Progress arrives as EventProgress, completion as EventDone with Dest set.
func (m *Manager) Receive(code string, _ ReceiveOptions) (string, error) {
	code = normalizeCode(code)
	if len(code) < minCodeLen {
		return "", fmt.Errorf("%w: need at least %d characters", ErrBadCode, minCodeLen)
	}

	if err := m.awaitFreeSlot(KindReceive); err != nil {
		return "", err
	}

	m.mu.Lock()
	if m.slots[KindReceive] != nil {
		m.mu.Unlock()
		return "", fmt.Errorf("%w: cancel the current receive first", ErrBusy)
	}
	ctx, cancel := context.WithCancel(context.Background())
	p, err := m.newPeer(ctx, peerRequest{kind: KindReceive, secret: code})
	if err != nil {
		cancel()
		m.mu.Unlock()
		return "", err
	}
	dest := filepath.Join(m.destRoot, code)
	if err := os.MkdirAll(dest, 0o755); err != nil {
		cancel()
		m.mu.Unlock()
		return "", fmt.Errorf("creating receive folder: %w", err)
	}
	// croc saves into the CWD; point it at the per-code folder. The unwind
	// in run() moves the CWD back to destRoot before any cleanup.
	if err := os.Chdir(dest); err != nil {
		cancel()
		m.mu.Unlock()
		return "", fmt.Errorf("entering receive folder: %w", err)
	}
	sl := m.claimLocked(KindReceive, cancel)
	m.mu.Unlock()

	slog.Info("croc receive: starting", "id", sl.id, "dest", dest)
	stopped := m.watch(ctx, sl, KindReceive, p)
	go m.run(KindReceive, sl, p, cancel, stopped, dest)
	return sl.id, nil
}

// Cancel aborts the running transfer of the given kind, if any. It returns
// as soon as croc has been told to stop, without waiting for the unwind:
// against a remote peer that takes seconds, and a Cancel button that does
// not respond until then reads as a hang. The next Send/Receive absorbs the
// leftover unwinding (awaitFreeSlot). Idempotent.
func (m *Manager) Cancel(k Kind) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if sl := m.slots[k]; sl != nil && !sl.cancelled {
		slog.Info("croc cancel requested", "kind", k.String(), "id", sl.id)
		sl.cancelled = true
		sl.cancel()
	}
}

// Shutdown aborts any running transfers and waits for them to unwind, but
// no longer than ctx allows: quitting must not stall behind croc's unwinding
// the way a user-initiated cancel does. Idempotent; always returns nil.
func (m *Manager) Shutdown(ctx context.Context) error {
	var waits []chan struct{}
	m.mu.Lock()
	for _, sl := range m.slots {
		if sl == nil {
			continue
		}
		if !sl.cancelled {
			sl.cancelled = true
			sl.cancel()
		}
		waits = append(waits, sl.done)
	}
	m.mu.Unlock()
	for _, done := range waits {
		select {
		case <-done:
		case <-ctx.Done():
			slog.Warn("croc: transfers still unwinding at shutdown")
			return nil
		}
	}
	return nil
}

// claimLocked registers a new slot; m.mu must be held.
func (m *Manager) claimLocked(k Kind, cancel context.CancelFunc) *slot {
	sl := &slot{
		id:     fmt.Sprintf("%s-%d", k, m.seq.Add(1)),
		cancel: cancel,
		done:   make(chan struct{}),
	}
	m.slots[k] = sl
	return sl
}

// watch starts the progress poller for one transfer, wrapping its Stats into
// ID-carrying events.
func (m *Manager) watch(ctx context.Context, sl *slot, k Kind, s snapshotter) <-chan struct{} {
	return watchProgress(ctx, s, m.poll, m.statsEvery, func(st Stats) {
		m.emit(Event{ID: sl.id, Kind: k, Type: EventProgress, Stats: &st})
	})
}

// run performs the blocking transfer and the unwind choreography. It is the
// single implementation for both kinds — dest is empty for sends.
func (m *Manager) run(k Kind, sl *slot, p peer, cancel context.CancelFunc, stopped <-chan struct{}, dest string) {
	err := p.Run()

	// Stop the poller and wait it out before anything terminal: a tick
	// already past its ctx check could otherwise emit progress after the
	// terminal event and drag the UI back off its completion screen.
	cancel()
	<-stopped

	// A receive ran with the process CWD inside dest. Leave before cleanup:
	// Windows cannot delete the working directory at all, and everywhere
	// else the process would be left sitting in a deleted directory.
	if k == KindReceive {
		if err := os.Chdir(m.destRoot); err != nil {
			slog.Warn("croc receive: leaving dest folder", "err", err)
		}
	}

	m.mu.Lock()
	cancelled := sl.cancelled
	m.mu.Unlock()

	switch {
	case cancelled:
		slog.Info("croc cancelled", "kind", k.String(), "id", sl.id)
		if k == KindReceive {
			removeIfEmpty(dest)
		}
	case err != nil:
		slog.Error("croc failed", "kind", k.String(), "id", sl.id, "err", err)
		if k == KindReceive {
			removeIfEmpty(dest)
		}
		m.emit(Event{ID: sl.id, Kind: k, Type: EventFailed, Err: err})
	default:
		slog.Info("croc completed", "kind", k.String(), "id", sl.id)
		if st, ok := finalStats(p); ok {
			m.emit(Event{ID: sl.id, Kind: k, Type: EventProgress, Stats: &st})
		}
		m.emit(Event{ID: sl.id, Kind: k, Type: EventDone, Dest: dest})
	}

	// Free the slot only after the terminal event is out: awaitFreeSlot
	// waiters start strictly after this transfer has said its last word, so
	// no event can be attributed to the wrong transfer.
	m.mu.Lock()
	m.slots[k] = nil
	m.mu.Unlock()
	close(sl.done)
}

// awaitFreeSlot waits out a transfer that was cancelled but has not finished
// unwinding yet, so the next one can take its place. Transfers that are
// running and not cancelled are not waited for — that case is ErrBusy at the
// claim check.
func (m *Manager) awaitFreeSlot(k Kind) error {
	m.mu.Lock()
	sl := m.slots[k]
	var done chan struct{}
	if sl != nil && sl.cancelled {
		done = sl.done
	}
	m.mu.Unlock()
	if done == nil {
		return nil
	}
	slog.Info("croc: waiting for the cancelled transfer to unwind", "kind", k.String())
	select {
	case <-done:
		return nil
	case <-time.After(m.cancelGrace):
		return fmt.Errorf("%w: try again in a moment", ErrUnwinding)
	}
}

// removeIfEmpty clears the per-code folder a receive created when nothing
// was saved into it — cancelled or failed attempts otherwise litter the
// destination root with empty folders. Partial files stay (croc resumes from
// them when the same code is retried).
func removeIfEmpty(dir string) {
	// os.Remove refuses to delete non-empty directories, which is exactly
	// the semantics needed here.
	_ = os.Remove(dir)
}
