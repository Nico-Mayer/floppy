package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/schollz/croc/v10/src/croc"
	"github.com/schollz/croc/v10/src/models"
)

// eventRecorder captures CrocService events for one test by swapping the
// package-level emit hook.
type eventRecorder struct {
	mu     sync.Mutex
	events map[string][]any
	// order is every event name as emitted, so tests can assert on sequencing.
	order []string
	wake  chan struct{}
}

func recordEvents(t *testing.T) *eventRecorder {
	t.Helper()
	r := &eventRecorder{events: map[string][]any{}, wake: make(chan struct{}, 64)}
	orig := emit
	emit = func(name string, data any) {
		r.mu.Lock()
		r.events[name] = append(r.events[name], data)
		r.order = append(r.order, name)
		r.mu.Unlock()
		select {
		case r.wake <- struct{}{}:
		default:
		}
	}
	t.Cleanup(func() { emit = orig })
	return r
}

func (r *eventRecorder) count(name string) int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.events[name])
}

// last returns the name of the most recently emitted event.
func (r *eventRecorder) last(t *testing.T) string {
	t.Helper()
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.order) == 0 {
		t.Fatal("no events emitted")
	}
	return r.order[len(r.order)-1]
}

// stats returns every TransferStats payload recorded for a progress event.
func (r *eventRecorder) stats(t *testing.T, name string) []TransferStats {
	t.Helper()
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]TransferStats, 0, len(r.events[name]))
	for _, payload := range r.events[name] {
		s, ok := payload.(TransferStats)
		if !ok {
			t.Fatalf("%s payload is not TransferStats: %T", name, payload)
		}
		out = append(out, s)
	}
	return out
}

// waitFor blocks until an event of the given name arrives and returns its
// latest payload; a croc:error arriving first fails the test.
func (r *eventRecorder) waitFor(t *testing.T, name string, timeout time.Duration) any {
	t.Helper()
	deadline := time.After(timeout)
	for {
		r.mu.Lock()
		if got := r.events[name]; len(got) > 0 {
			payload := got[len(got)-1]
			r.mu.Unlock()
			return payload
		}
		if errs := r.events["croc:error"]; len(errs) > 0 && name != "croc:error" {
			r.mu.Unlock()
			t.Fatalf("waiting for %s, got croc:error: %s", name, errs[0])
		}
		r.mu.Unlock()
		select {
		case <-r.wake:
		case <-deadline:
			t.Fatalf("timed out waiting for %s", name)
		}
	}
}

// waitForString is waitFor for the events whose payload is a plain string.
func (r *eventRecorder) waitForString(t *testing.T, name string, timeout time.Duration) string {
	t.Helper()
	payload, ok := r.waitFor(t, name, timeout).(string)
	if !ok {
		t.Fatalf("%s payload is not a string", name)
	}
	return payload
}

var (
	croctoolBuild sync.Once
	croctoolBin   string
	croctoolErr   error
)

// croctool starts the external test peer (testdata/croctool). The binary is
// built once and executed directly — running it via `go run` would make
// cleanup kill only the wrapper and orphan the peer, which then squats on the
// croc relay ports and corrupts later tests' handshakes.
func croctool(t *testing.T, env []string, args ...string) (*exec.Cmd, *bufio.Scanner) {
	t.Helper()
	moduleRoot, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	croctoolBuild.Do(func() {
		dir, err := os.MkdirTemp("", "croctool")
		if err != nil {
			croctoolErr = err
			return
		}
		croctoolBin = filepath.Join(dir, "croctool")
		build := exec.Command("go", "build", "-o", croctoolBin, "./testdata/croctool")
		build.Dir = moduleRoot
		build.Stderr = os.Stderr
		croctoolErr = build.Run()
	})
	if croctoolErr != nil {
		t.Fatalf("building croctool: %v", croctoolErr)
	}

	cmd := exec.Command(croctoolBin, args...)
	cmd.Dir = moduleRoot
	cmd.Env = append(os.Environ(), env...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	})
	return cmd, bufio.NewScanner(stdout)
}

func makePayload(t *testing.T) (path string, data []byte) {
	t.Helper()
	data = make([]byte, 2<<20)
	if _, err := rand.Read(data); err != nil {
		t.Fatal(err)
	}
	path = filepath.Join(t.TempDir(), "payload.bin")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	return path, data
}

// TestReceiveFromPeer drives CrocService.Receive against a real croc sender
// running as a separate process.
func TestReceiveFromPeer(t *testing.T) {
	if testing.Short() {
		t.Skip("network transfer")
	}
	rec := recordEvents(t)
	src, payload := makePayload(t)

	// Throttled so the transfer is slow enough for progress polling to
	// observe it — full speed on localhost outruns the poll interval.
	_, out := croctool(t, []string{"CROC_THROTTLE=500k"}, "send", src)
	code := ""
	for out.Scan() {
		if c, ok := strings.CutPrefix(out.Text(), "CODE:"); ok {
			code = strings.TrimSpace(c)
			break
		}
	}
	if code == "" {
		t.Fatal("croctool printed no code")
	}
	t.Logf("using code %q", code)

	// Receive chdirs into its per-code folder itself; just restore the CWD
	// afterwards so later tests are unaffected.
	destRoot := t.TempDir()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(cwd)

	svc := &CrocService{destRoot: destRoot}
	if err := svc.Receive(code); err != nil {
		t.Fatalf("Receive: %v", err)
	}
	dest := filepath.Join(destRoot, code)
	if got := rec.waitForString(t, "croc:received", 120*time.Second); got != dest {
		t.Errorf("croc:received payload = %q, want %q", got, dest)
	}

	got, err := os.ReadFile(filepath.Join(dest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("received file differs: got %d bytes, want %d", len(got), len(payload))
	}
	stats := rec.stats(t, "croc:recv:progress")
	if len(stats) == 0 {
		t.Fatal("no croc:recv:progress events emitted")
	}
	size := int64(len(payload))
	if last := stats[len(stats)-1]; last.Percent != 100 || last.Sent != size || last.Total != size {
		t.Errorf("final stats = %+v, want %d/%d bytes at 100%%", last, size, size)
	}
	// The transfer is throttled to 500 kB/s, so the poller has several seconds
	// of samples to measure a rate from.
	if !slices.ContainsFunc(stats, func(s TransferStats) bool { return s.Bps > 0 }) {
		t.Errorf("no progress event carried a transfer rate: %+v", stats)
	}
	// croc:received must be the last word: a progress event landing after it
	// leaves the UI sitting on 100% instead of the completion screen.
	if last := rec.last(t); last != "croc:received" {
		t.Errorf("last event was %s, want croc:received", last)
	}
}

// TestSendToPeer drives CrocService.Send against a real croc receiver running
// as a separate process.
func TestSendToPeer(t *testing.T) {
	if testing.Short() {
		t.Skip("network transfer")
	}
	rec := recordEvents(t)
	src, payload := makePayload(t)
	dest := t.TempDir()

	svc := &CrocService{destRoot: dest}
	if err := svc.Send([]string{src}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitForString(t, "croc:code", 10*time.Second)

	croctool(t, nil, "recv", code, dest)

	rec.waitFor(t, "croc:sent", 120*time.Second)

	got, err := os.ReadFile(filepath.Join(dest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("received file differs: got %d bytes, want %d", len(got), len(payload))
	}
	// No progress assertion here: the receiving side can't be throttled, and
	// a localhost transfer can finish inside a single poll interval.
}

// TestCancelReceive verifies cancelling a pending receive neither errors nor
// completes, and that the per-code folder is removed when nothing arrived.
func TestCancelReceive(t *testing.T) {
	rec := recordEvents(t)
	destRoot := t.TempDir()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(cwd)

	code := "0000-never-matches-anything"
	svc := &CrocService{destRoot: destRoot}
	if err := svc.Receive(code); err != nil {
		t.Fatalf("Receive: %v", err)
	}
	time.Sleep(200 * time.Millisecond)

	// Cancel must return promptly whatever croc is doing: it drives a button,
	// and against a remote peer the unwinding itself can take many seconds.
	start := time.Now()
	svc.CancelReceive()
	if took := time.Since(start); took > time.Second {
		t.Errorf("CancelReceive blocked for %s; it must not wait for croc to unwind", took)
	}

	// Retrying straight away is what a user does after mistyping a code. The
	// slot may still be unwinding, so Receive waits it out rather than
	// reporting the previous transfer as still running.
	if err := svc.Receive(code); err != nil {
		t.Fatalf("receive immediately after cancel: %v", err)
	}
	svc.CancelReceive()

	// Cleanup and the completion switch run as the goroutine unwinds, after
	// cancel has returned — so wait for them rather than assuming a duration.
	dest := filepath.Join(destRoot, code)
	deadline := time.Now().Add(30 * time.Second)
	for {
		if _, err := os.Stat(dest); os.IsNotExist(err) {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("empty per-code folder %s not cleaned up", dest)
		}
		time.Sleep(50 * time.Millisecond)
	}
	if rec.count("croc:error") > 0 {
		rec.mu.Lock()
		msg := rec.events["croc:error"][0]
		rec.mu.Unlock()
		t.Errorf("cancelled receive emitted error: %s", msg)
	}
	if rec.count("croc:received") > 0 {
		t.Error("cancelled receive emitted completion")
	}
}

// TestTransferBytesResumeCredit checks the resume accounting: croc only
// counts freshly moved bytes in TotalSent, so chunks the receiver already has
// must be credited (mirrors croc's own setBar math).
func TestTransferBytesResumeCredit(t *testing.T) {
	chunk := int64(models.TCP_BUFFER_SIZE / 2)
	total := 100 * chunk
	c := &croc.Client{}
	c.Options.IsSender = true
	c.Step4FileTransferred = true
	c.FilesToTransfer = []croc.FileInfo{{Size: total}}
	// Receiver is missing only 10 of 100 chunks.
	c.CurrentFileChunks = make([]int64, 10)

	check := func(stage string, wantDone int64) {
		t.Helper()
		done, gotTotal, ok := transferBytes(c)
		if !ok || done != wantDone || gotTotal != total {
			t.Errorf("%s: got %d/%d ok=%v, want %d/%d true", stage, done, gotTotal, ok, wantDone, total)
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

// TestWatchProgressStops checks the channel watchProgress returns really means
// "no more events". Transfers wait on it before emitting croc:sent or
// croc:received; a tick escaping afterwards would knock the UI back off its
// completion screen and leave it sitting at 100%.
func TestWatchProgressStops(t *testing.T) {
	rec := recordEvents(t)
	c := &croc.Client{}
	c.Options.IsSender = true
	c.Step4FileTransferred = true
	c.FilesToTransfer = []croc.FileInfo{{Size: 1000}}
	c.TotalSent = 500

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	stopped := watchProgress(ctx, c, "croc:send:progress")

	deadline := time.After(5 * time.Second)
	for rec.count("croc:send:progress") == 0 {
		select {
		case <-rec.wake:
		case <-deadline:
			t.Fatal("poller emitted no progress at all")
		}
	}

	cancel()
	<-stopped
	emitted := rec.count("croc:send:progress")
	time.Sleep(3 * progressPollInterval)
	if got := rec.count("croc:send:progress"); got != emitted {
		t.Errorf("%d events emitted after the poller reported itself stopped", got-emitted)
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

// TestSendResumedTransfer pre-seeds the receiver with the first half of the
// payload and verifies a resumed send still completes with an intact file.
func TestSendResumedTransfer(t *testing.T) {
	if testing.Short() {
		t.Skip("network transfer")
	}
	rec := recordEvents(t)
	src, payload := makePayload(t)
	dest := t.TempDir()

	// Pre-seed a partial file — same bytes croc would have left behind after
	// an interrupted transfer.
	if err := os.WriteFile(filepath.Join(dest, "payload.bin"), payload[:len(payload)/2], 0o644); err != nil {
		t.Fatal(err)
	}

	svc := &CrocService{destRoot: dest}
	if err := svc.Send([]string{src}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitForString(t, "croc:code", 10*time.Second)

	croctool(t, nil, "recv", code, dest)

	rec.waitFor(t, "croc:sent", 120*time.Second)

	got, err := os.ReadFile(filepath.Join(dest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("resumed file differs: got %d bytes, want %d", len(got), len(payload))
	}
}
