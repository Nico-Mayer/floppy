package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"os"
	"os/exec"
	"path/filepath"
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
	events map[string][]string
	wake   chan struct{}
}

func recordEvents(t *testing.T) *eventRecorder {
	t.Helper()
	r := &eventRecorder{events: map[string][]string{}, wake: make(chan struct{}, 64)}
	orig := emit
	emit = func(name, data string) {
		r.mu.Lock()
		r.events[name] = append(r.events[name], data)
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

// waitFor blocks until an event of the given name arrives and returns its
// latest payload; a croc:error arriving first fails the test.
func (r *eventRecorder) waitFor(t *testing.T, name string, timeout time.Duration) string {
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

	// Receiving writes into the CWD (see ServiceStartup); point it at a
	// scratch dir for the test.
	dest := t.TempDir()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dest); err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(cwd)

	svc := &CrocService{dest: dest}
	if err := svc.Receive(code); err != nil {
		t.Fatalf("Receive: %v", err)
	}
	if got := rec.waitFor(t, "croc:received", 120*time.Second); got != dest {
		t.Errorf("croc:received payload = %q, want %q", got, dest)
	}

	got, err := os.ReadFile(filepath.Join(dest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("received file differs: got %d bytes, want %d", len(got), len(payload))
	}
	if rec.count("croc:recv:progress") == 0 {
		t.Error("no croc:recv:progress events emitted")
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

	svc := &CrocService{dest: dest}
	if err := svc.Send([]string{src}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitFor(t, "croc:code", 10*time.Second)

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
// completes — the cancelled flag suppresses both.
func TestCancelReceive(t *testing.T) {
	rec := recordEvents(t)

	svc := &CrocService{dest: t.TempDir()}
	if err := svc.Receive("0000-never-matches-anything"); err != nil {
		t.Fatalf("Receive: %v", err)
	}
	time.Sleep(200 * time.Millisecond)
	svc.CancelReceive()
	time.Sleep(500 * time.Millisecond)

	if n := rec.count("croc:error"); n > 0 {
		rec.mu.Lock()
		msg := rec.events["croc:error"][0]
		rec.mu.Unlock()
		t.Errorf("cancelled receive emitted error: %s", msg)
	}
	if rec.count("croc:received") > 0 {
		t.Error("cancelled receive emitted completion")
	}
}

// TestTransferPercentResumeCredit checks the resume accounting: croc only
// counts freshly moved bytes in TotalSent, so chunks the receiver already has
// must be credited (mirrors croc's own setBar math).
func TestTransferPercentResumeCredit(t *testing.T) {
	chunk := int64(models.TCP_BUFFER_SIZE / 2)
	c := &croc.Client{}
	c.Options.IsSender = true
	c.Step4FileTransferred = true
	c.FilesToTransfer = []croc.FileInfo{{Size: 100 * chunk}}
	// Receiver is missing only 10 of 100 chunks.
	c.CurrentFileChunks = make([]int64, 10)

	if got, ok := transferPercent(c); !ok || got != 90 {
		t.Errorf("resume start: got %d%% ok=%v, want 90%% true", got, ok)
	}
	c.TotalSent = 5 * chunk
	if got, ok := transferPercent(c); !ok || got != 95 {
		t.Errorf("resume mid: got %d%% ok=%v, want 95%% true", got, ok)
	}
	// Fresh transfer: no chunk list yet, no credit.
	c.CurrentFileChunks = nil
	c.TotalSent = 50 * chunk
	if got, ok := transferPercent(c); !ok || got != 50 {
		t.Errorf("fresh mid: got %d%% ok=%v, want 50%% true", got, ok)
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

	svc := &CrocService{dest: dest}
	if err := svc.Send([]string{src}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitFor(t, "croc:code", 10*time.Second)

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
