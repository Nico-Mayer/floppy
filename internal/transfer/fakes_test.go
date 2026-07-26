package transfer

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

// fakePeer stands in for a croc endpoint. Run blocks until the test releases
// it or the transfer context is cancelled; Snapshot serves scripted snaps
// under a mutex — which is exactly what makes the poller race-detector clean
// in unit tests (the production Snapshot is the documented exception).
type fakePeer struct {
	ctx context.Context

	mu     sync.Mutex
	snaps  snap
	haveOk bool
	runErr error

	started chan struct{} // closed when Run is entered
	release chan struct{} // close to let Run return normally
	// unwind, when non-nil, is how long a *cancelled* Run keeps running
	// before returning — the fake's stand-in for croc's slow teardown.
	// Closed by the test to finish the unwind.
	unwind chan struct{}
}

func newFakePeer(ctx context.Context) *fakePeer {
	return &fakePeer{
		ctx:     ctx,
		started: make(chan struct{}),
		release: make(chan struct{}),
	}
}

func (p *fakePeer) Run() error {
	close(p.started)
	select {
	case <-p.release:
		p.mu.Lock()
		defer p.mu.Unlock()
		return p.runErr
	case <-p.ctx.Done():
		if p.unwind != nil {
			<-p.unwind
		}
		return p.ctx.Err()
	}
}

func (p *fakePeer) Snapshot() (snap, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.snaps, p.haveOk
}

func (p *fakePeer) setSnap(s snap) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.snaps, p.haveOk = s, true
}

func (p *fakePeer) finish(err error) {
	p.mu.Lock()
	p.runErr = err
	p.mu.Unlock()
	close(p.release)
}

// fakeFactory hands out fakePeers and records the requests it saw.
type fakeFactory struct {
	mu    sync.Mutex
	err   error // returned instead of a peer when set
	peers []*fakePeer
	reqs  []peerRequest
	// holdUnwind makes every peer take a test-controlled unwind after
	// cancellation.
	holdUnwind chan struct{}
}

func (f *fakeFactory) new(ctx context.Context, req peerRequest) (peer, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.err != nil {
		return nil, f.err
	}
	p := newFakePeer(ctx)
	p.unwind = f.holdUnwind
	f.peers = append(f.peers, p)
	f.reqs = append(f.reqs, req)
	return p, nil
}

func (f *fakeFactory) peer(t *testing.T, i int) *fakePeer {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	if i >= len(f.peers) {
		t.Fatalf("no peer %d (have %d)", i, len(f.peers))
	}
	return f.peers[i]
}

func (f *fakeFactory) req(t *testing.T, i int) peerRequest {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	if i >= len(f.reqs) {
		t.Fatalf("no request %d (have %d)", i, len(f.reqs))
	}
	return f.reqs[i]
}

// recorder is an Emitter that captures events for assertions.
type recorder struct {
	mu     sync.Mutex
	events []Event
	wake   chan struct{}
}

func newRecorder() *recorder {
	return &recorder{wake: make(chan struct{}, 64)}
}

func (r *recorder) emit(ev Event) {
	r.mu.Lock()
	r.events = append(r.events, ev)
	r.mu.Unlock()
	select {
	case r.wake <- struct{}{}:
	default:
	}
}

func (r *recorder) all() []Event {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]Event(nil), r.events...)
}

func (r *recorder) byType(typ EventType) []Event {
	var out []Event
	for _, ev := range r.all() {
		if ev.Type == typ {
			out = append(out, ev)
		}
	}
	return out
}

// waitType blocks until an event of the given type exists and returns the
// first one. Event-driven — no polling sleeps.
func (r *recorder) waitType(t *testing.T, typ EventType, timeout time.Duration) Event {
	t.Helper()
	deadline := time.After(timeout)
	for {
		if evs := r.byType(typ); len(evs) > 0 {
			return evs[0]
		}
		select {
		case <-r.wake:
		case <-deadline:
			t.Fatalf("timed out waiting for event type %d; got %+v", typ, r.all())
		}
	}
}

// newTestManager builds a Manager on a fake factory with fast intervals and
// a temp DestRoot. It restores the process CWD afterwards — Manager.New
// parks it in DestRoot by contract.
func newTestManager(t *testing.T, f *fakeFactory) (*Manager, *recorder) {
	t.Helper()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	// Resolve symlinks so CWD assertions hold on macOS, where TempDir hands
	// out /var/... but the kernel reports /private/var/....
	destRoot, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}

	rec := newRecorder()
	m, err := New(Config{
		DestRoot:      destRoot,
		Emit:          rec.emit,
		PollInterval:  2 * time.Millisecond,
		StatsInterval: 5 * time.Millisecond,
	})
	if err != nil {
		t.Fatal(err)
	}
	m.newPeer = f.new
	return m, rec
}

// waitClosed asserts a channel closes within the timeout.
func waitClosed(t *testing.T, ch chan struct{}, timeout time.Duration, what string) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(timeout):
		t.Fatalf("timed out waiting for %s", what)
	}
}

// slotDone fetches the done channel of the current slot for a kind, or nil.
func slotDone(m *Manager, k Kind) chan struct{} {
	m.mu.Lock()
	defer m.mu.Unlock()
	if sl := m.slots[k]; sl != nil {
		return sl.done
	}
	return nil
}
