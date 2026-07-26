package transfer

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/schollz/croc/v10/src/croc"
	"github.com/schollz/croc/v10/src/models"
)

// syncSnaps is a synchronized snapshotter for poller tests.
type syncSnaps struct {
	mu sync.Mutex
	s  snap
	ok bool
}

func (s *syncSnaps) Snapshot() (snap, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.s, s.ok
}

func (s *syncSnaps) set(v snap) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.s, s.ok = v, true
}

// TestWatchProgressStops checks the channel watchProgress returns really
// means "no more events". Transfers wait on it before emitting terminal
// events; a tick escaping afterwards would knock the UI back off its
// completion screen.
func TestWatchProgressStops(t *testing.T) {
	src := &syncSnaps{}
	src.set(snap{done: 500, total: 1000, file: "x", index: 1, count: 1})

	var mu sync.Mutex
	var emitted []Stats
	wake := make(chan struct{}, 16)
	emit := func(st Stats) {
		mu.Lock()
		emitted = append(emitted, st)
		mu.Unlock()
		select {
		case wake <- struct{}{}:
		default:
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	stopped := watchProgress(ctx, src, 2*time.Millisecond, 5*time.Millisecond, emit)

	deadline := time.After(5 * time.Second)
	for {
		mu.Lock()
		n := len(emitted)
		mu.Unlock()
		if n > 0 {
			break
		}
		select {
		case <-wake:
		case <-deadline:
			t.Fatal("poller emitted nothing")
		}
	}

	cancel()
	<-stopped
	mu.Lock()
	n := len(emitted)
	mu.Unlock()
	time.Sleep(10 * 2 * time.Millisecond) // several poll intervals of silence
	mu.Lock()
	after := len(emitted)
	mu.Unlock()
	if after != n {
		t.Errorf("%d events emitted after the poller reported itself stopped", after-n)
	}
}

func TestWatchProgressEmitsManifestChanges(t *testing.T) {
	src := &syncSnaps{}
	src.set(snap{done: 1, total: 100, file: "one.bin", index: 1, count: 2})

	var mu sync.Mutex
	var files []string
	wake := make(chan struct{}, 16)
	emit := func(st Stats) {
		mu.Lock()
		files = append(files, st.File)
		mu.Unlock()
		select {
		case wake <- struct{}{}:
		default:
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	stopped := watchProgress(ctx, src, 2*time.Millisecond, time.Hour, emit)

	waitFiles := func(want string) {
		t.Helper()
		deadline := time.After(5 * time.Second)
		for {
			mu.Lock()
			seen := len(files) > 0 && files[len(files)-1] == want
			mu.Unlock()
			if seen {
				return
			}
			select {
			case <-wake:
			case <-deadline:
				t.Fatalf("never saw file %q in %v", want, files)
			}
		}
	}

	waitFiles("one.bin")
	// Same percent (1%), different file — must emit anyway: this payload is
	// the only thing telling a receiver what is arriving.
	src.set(snap{done: 1, total: 100, file: "two.bin", index: 2, count: 2})
	waitFiles("two.bin")

	cancel()
	<-stopped
}

// TestSnapshotResumeCredit checks the resume accounting against a hand-built
// croc client (no goroutines — race-free): croc only counts freshly moved
// bytes in TotalSent, so chunks the receiver already has must be credited
// (mirrors croc's own setBar math).
func TestSnapshotResumeCredit(t *testing.T) {
	chunk := int64(models.TCP_BUFFER_SIZE / 2)
	total := 100 * chunk
	c := &croc.Client{}
	c.Options.IsSender = true
	c.Step4FileTransferred = true
	c.FilesToTransfer = []croc.FileInfo{{Size: total}}
	// Receiver is missing only 10 of 100 chunks.
	c.CurrentFileChunks = make([]int64, 10)
	p := &crocPeer{client: c}

	check := func(stage string, wantDone int64) {
		t.Helper()
		got, ok := p.Snapshot()
		if !ok || got.done != wantDone || got.total != total {
			t.Errorf("%s: got %d/%d ok=%v, want %d/%d true", stage, got.done, got.total, ok, wantDone, total)
		}
	}

	check("resume start", 90*chunk)
	c.TotalSent = 5 * chunk
	check("resume mid", 95*chunk)
	// Fresh transfer: no chunk list yet, no credit.
	c.CurrentFileChunks = nil
	c.TotalSent = 50 * chunk
	check("fresh mid", 50*chunk)
}

// TestSnapshotManifest checks the file identification a receiver depends on:
// until the first progress payload it knows nothing about what is coming.
func TestSnapshotManifest(t *testing.T) {
	c := &croc.Client{}
	c.Options.IsSender = true
	c.Step4FileTransferred = true
	c.FilesToTransfer = []croc.FileInfo{
		{Name: "one.bin", Size: 100},
		{Name: "two.bin", Size: 200},
		{Name: "three.bin", Size: 300},
	}
	p := &crocPeer{client: c}

	got, ok := p.Snapshot()
	if !ok {
		t.Fatal("no reading for a started transfer")
	}
	if got.file != "one.bin" || got.index != 1 || got.count != 3 || got.total != 600 {
		t.Errorf("first file: got %+v, want one.bin 1/3 of 600 bytes", got)
	}

	// Two files done, third in flight.
	c.FilesToTransferCurrentNum = 2
	if got, _ = p.Snapshot(); got.file != "three.bin" || got.index != 3 || got.done != 300 {
		t.Errorf("third file: got %+v, want three.bin 3/3 with 300 bytes done", got)
	}

	// croc leaves the index past the end once everything is done; the label
	// must not index out of range.
	c.FilesToTransferCurrentNum = 3
	if got, _ = p.Snapshot(); got.file != "three.bin" || got.index != 3 {
		t.Errorf("after the last file: got %+v, want three.bin held at 3/3", got)
	}
}

func TestSnapshotSenderQuietUntilTransferStep(t *testing.T) {
	c := &croc.Client{}
	c.Options.IsSender = true
	c.FilesToTransfer = []croc.FileInfo{{Name: "x", Size: 10}}
	p := &crocPeer{client: c}
	if _, ok := p.Snapshot(); ok {
		t.Error("sender reported progress before the transfer step — the UI would leave 'waiting' early")
	}
}

// TestEtaSeconds covers the two states the UI treats specially: "no estimate
// yet" (-1) and "finished" (0).
func TestEtaSeconds(t *testing.T) {
	if got := etaSeconds(1000, 0); got != -1 {
		t.Errorf("no rate: got %d, want -1", got)
	}
	if got := etaSeconds(0, 5000); got != 0 {
		t.Errorf("nothing left: got %d, want 0", got)
	}
	if got := etaSeconds(10_000, 1000); got != 10 {
		t.Errorf("steady rate: got %d, want 10", got)
	}
}
