package transfer

// Integration tests: real croc transfers against a croctool peer process,
// through a relay running *in this process* — hermetic, no internet. They
// skip under -short (they spawn processes and move real bytes) and under
// -race (the live poller against a live croc client is the one documented
// data race; see crocPeer.Snapshot).

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/schollz/croc/v10/src/tcp"
)

const relayPassword = "floppy-test"

func skipUnlessLive(t *testing.T) {
	t.Helper()
	if testing.Short() {
		t.Skip("real transfer (skipped in -short)")
	}
	if raceEnabled {
		t.Skip("live croc poller is intentionally unsynchronized (see crocPeer.Snapshot RACE FENCE); covered by the non-race run")
	}
}

// freePorts reserves n distinct ports by binding and releasing them.
func freePorts(t *testing.T, n int) []string {
	t.Helper()
	ports := make([]string, n)
	for i := range ports {
		l, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatal(err)
		}
		ports[i] = fmt.Sprintf("%d", l.Addr().(*net.TCPAddr).Port)
		l.Close()
	}
	return ports
}

// startLocalRelay runs a croc relay inside the test process (a relay is a
// plain TCP server — only transfer *endpoints* must not share a process) and
// returns its address.
func startLocalRelay(t *testing.T) string {
	t.Helper()
	ports := freePorts(t, 5)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	// Main port hands connecting clients the banner of transfer ports, same
	// layout croc's own tests use.
	go tcp.RunCtx(ctx, "warn", "127.0.0.1", ports[0], relayPassword, strings.Join(ports[1:], ","))
	for _, p := range ports[1:] {
		go tcp.RunCtx(ctx, "warn", "127.0.0.1", p, relayPassword)
	}

	addr := "127.0.0.1:" + ports[0]
	deadline := time.Now().Add(5 * time.Second)
	for {
		if err := tcp.PingServer(addr); err == nil {
			return addr
		}
		if time.Now().After(deadline) {
			t.Fatalf("local relay on %s never became reachable", addr)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func localRelayConfig(addr string) RelayConfig {
	return RelayConfig{
		Address:  addr,
		Password: relayPassword,
		// Forces every byte through the local relay: no LAN discovery, no
		// ephemeral sender-side relay — deterministic routing.
		DisableLocal: true,
	}
}

// newLiveManager builds a Manager on the real croc factory against the given
// relay, with a temp DestRoot and restored CWD.
func newLiveManager(t *testing.T, relay RelayConfig) (*Manager, *recorder) {
	t.Helper()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	destRoot, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	rec := newRecorder()
	m, err := New(Config{
		DestRoot:      destRoot,
		Relay:         relay,
		Emit:          rec.emit,
		PollInterval:  50 * time.Millisecond,
		StatsInterval: 200 * time.Millisecond,
	})
	if err != nil {
		t.Fatal(err)
	}
	return m, rec
}

var (
	croctoolBuild sync.Once
	croctoolBin   string
	croctoolErr   error
)

// pkgDir is the package directory — what ./testdata/croctool is relative to.
// Captured at binary start: the moment a Manager is constructed it parks the
// process CWD in its DestRoot, so a later os.Getwd() would point at a temp
// dir outside the module and `go build` would find no go.mod.
var pkgDir = func() string {
	d, err := os.Getwd()
	if err != nil {
		panic("integration tests: " + err.Error())
	}
	return d
}()

// croctool starts the external test peer (testdata/croctool). The binary is
// built once and executed directly — running it via `go run` would make
// cleanup kill only the wrapper and orphan the peer, which then squats on
// the relay rooms and corrupts later tests' handshakes.
func croctool(t *testing.T, env []string, args ...string) (*exec.Cmd, *bufio.Scanner) {
	t.Helper()
	croctoolBuild.Do(func() {
		dir, err := os.MkdirTemp("", "croctool")
		if err != nil {
			croctoolErr = err
			return
		}
		croctoolBin = filepath.Join(dir, "croctool")
		build := exec.Command("go", "build", "-o", croctoolBin, "./testdata/croctool")
		build.Dir = pkgDir
		build.Stderr = os.Stderr
		croctoolErr = build.Run()
	})
	if croctoolErr != nil {
		t.Fatalf("building croctool: %v", croctoolErr)
	}

	cmd := exec.Command(croctoolBin, args...)
	cmd.Dir = pkgDir
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

// relayEnv is the croctool environment pointing it at the local relay.
func relayEnv(addr string, extra ...string) []string {
	return append([]string{
		"CROC_RELAY=" + addr,
		"CROC_PASS=" + relayPassword,
		"CROC_NO_LOCAL=1",
	}, extra...)
}

func makePayload(t *testing.T, size int) (path string, data []byte) {
	t.Helper()
	data = make([]byte, size)
	if _, err := rand.Read(data); err != nil {
		t.Fatal(err)
	}
	path = filepath.Join(t.TempDir(), "payload.bin")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
	return path, data
}

// sendCode reads the code phrase a croctool sender prints on startup.
func sendCode(t *testing.T, out *bufio.Scanner) string {
	t.Helper()
	for out.Scan() {
		if c, ok := strings.CutPrefix(out.Text(), "CODE:"); ok {
			return strings.TrimSpace(c)
		}
	}
	t.Fatal("croctool printed no code")
	return ""
}

// waitTerminal returns the first EventDone or EventFailed.
func (r *recorder) waitTerminal(t *testing.T, timeout time.Duration) Event {
	t.Helper()
	deadline := time.After(timeout)
	for {
		for _, ev := range r.all() {
			if ev.Type == EventDone || ev.Type == EventFailed {
				return ev
			}
		}
		select {
		case <-r.wake:
		case <-deadline:
			t.Fatalf("timed out waiting for a terminal event; got %+v", r.all())
		}
	}
}

// requireDone waits for a terminal event and fails unless it is a success.
func (r *recorder) requireDone(t *testing.T, timeout time.Duration) Event {
	t.Helper()
	ev := r.waitTerminal(t, timeout)
	if ev.Type != EventDone {
		t.Fatalf("transfer failed: %v", ev.Err)
	}
	return ev
}

// TestLiveReceiveFromPeer drives Manager.Receive against a real croc sender
// in a separate process, and asserts the progress contract on the way.
func TestLiveReceiveFromPeer(t *testing.T) {
	skipUnlessLive(t)
	relay := startLocalRelay(t)
	m, rec := newLiveManager(t, localRelayConfig(relay))
	src, payload := makePayload(t, 2<<20)

	// Throttled so the transfer is slow enough for progress polling to
	// observe it — full speed on localhost outruns the poll interval.
	_, out := croctool(t, relayEnv(relay, "CROC_THROTTLE=500k"), "send", src)
	code := sendCode(t, out)

	id, err := m.Receive(code, ReceiveOptions{})
	if err != nil {
		t.Fatalf("Receive: %v", err)
	}
	done := rec.requireDone(t, 120*time.Second)
	dest := filepath.Join(m.destRoot, code)
	if done.ID != id || done.Dest != dest {
		t.Errorf("done = %+v, want id %q dest %q", done, id, dest)
	}

	got, err := os.ReadFile(filepath.Join(dest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("received file differs: got %d bytes, want %d", len(got), len(payload))
	}

	progress := rec.byType(EventProgress)
	if len(progress) == 0 {
		t.Fatal("no progress events emitted")
	}
	size := int64(len(payload))
	last := progress[len(progress)-1].Stats
	if last.Percent != 100 || last.Sent != size || last.Total != size {
		t.Errorf("final stats = %+v, want %d/%d bytes at 100%%", last, size, size)
	}
	// The receiver learns what it is getting from this payload and nothing
	// else, so the very first one has to carry the manifest.
	first := progress[0].Stats
	if first.File != "payload.bin" || first.FileCount != 1 || first.FileIndex != 1 {
		t.Errorf("first stats = %+v, want payload.bin as file 1 of 1", first)
	}
	// Throttled to 500 kB/s, so the poller has seconds of samples for a rate.
	if !slices.ContainsFunc(progress, func(e Event) bool { return e.Stats.Bps > 0 }) {
		t.Errorf("no progress event carried a transfer rate")
	}
	// Every event belongs to this transfer.
	for _, ev := range rec.all() {
		if ev.ID != id {
			t.Errorf("event with foreign id: %+v", ev)
		}
	}
	// The done event must be the last word.
	all := rec.all()
	if all[len(all)-1].Type != EventDone {
		t.Errorf("last event type = %d, want EventDone", all[len(all)-1].Type)
	}
}

// TestLiveSendToPeer drives Manager.Send against a real croc receiver.
func TestLiveSendToPeer(t *testing.T) {
	skipUnlessLive(t)
	relay := startLocalRelay(t)
	m, rec := newLiveManager(t, localRelayConfig(relay))
	src, payload := makePayload(t, 2<<20)
	peerDest := t.TempDir()

	id, err := m.Send([]string{src}, SendOptions{})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitType(t, EventCode, 10*time.Second)
	if code.ID != id {
		t.Errorf("code event id = %q, want %q", code.ID, id)
	}

	croctool(t, relayEnv(relay), "recv", code.Code, peerDest)

	rec.requireDone(t, 120*time.Second)
	got, err := os.ReadFile(filepath.Join(peerDest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("received file differs: got %d bytes, want %d", len(got), len(payload))
	}
}

// TestLiveSendResumedTransfer pre-seeds the receiver with the first half of
// the payload and verifies a resumed send still completes with an intact
// file.
func TestLiveSendResumedTransfer(t *testing.T) {
	skipUnlessLive(t)
	relay := startLocalRelay(t)
	m, rec := newLiveManager(t, localRelayConfig(relay))
	src, payload := makePayload(t, 2<<20)
	peerDest := t.TempDir()

	// Pre-seed a partial file — same bytes croc would have left behind
	// after an interrupted transfer.
	if err := os.WriteFile(filepath.Join(peerDest, "payload.bin"), payload[:len(payload)/2], 0o644); err != nil {
		t.Fatal(err)
	}

	if _, err := m.Send([]string{src}, SendOptions{}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitType(t, EventCode, 10*time.Second)
	croctool(t, relayEnv(relay), "recv", code.Code, peerDest)

	rec.requireDone(t, 120*time.Second)
	got, err := os.ReadFile(filepath.Join(peerDest, "payload.bin"))
	if err != nil {
		t.Fatalf("received file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("resumed file differs: got %d bytes, want %d", len(got), len(payload))
	}
}

// TestLiveCancelReceive verifies cancelling a receive whose code matches
// nothing: no terminal event, prompt cancel, retry absorbed, empty folder
// removed. Local relay makes the unwind fast and deterministic — against the
// public relay this took 30+ seconds and flaked.
func TestLiveCancelReceive(t *testing.T) {
	skipUnlessLive(t)
	relay := startLocalRelay(t)
	m, rec := newLiveManager(t, localRelayConfig(relay))

	code := "0000-never-matches-anything"
	if _, err := m.Receive(code, ReceiveOptions{}); err != nil {
		t.Fatalf("Receive: %v", err)
	}

	// Cancel must return promptly whatever croc is doing: it drives a
	// button, and the unwinding itself can take seconds.
	start := time.Now()
	m.Cancel(KindReceive)
	if took := time.Since(start); took > time.Second {
		t.Errorf("Cancel blocked for %s; it must not wait for croc to unwind", took)
	}

	// Retrying straight away is what a user does after mistyping a code.
	if _, err := m.Receive(code, ReceiveOptions{}); err != nil {
		t.Fatalf("receive immediately after cancel: %v", err)
	}
	done := slotDone(m, KindReceive)
	m.Cancel(KindReceive)
	if done != nil {
		waitClosed(t, done, 30*time.Second, "receive to unwind")
	}

	dest := filepath.Join(m.destRoot, code)
	if _, err := os.Stat(dest); !os.IsNotExist(err) {
		t.Errorf("empty per-code folder %s not cleaned up", dest)
	}
	for _, ev := range rec.all() {
		if ev.Type == EventDone || ev.Type == EventFailed {
			t.Errorf("cancelled receive emitted terminal event %+v", ev)
		}
	}
	if cwd, _ := os.Getwd(); cwd != m.destRoot {
		t.Errorf("cwd after cancelled receive = %q, want %q", cwd, m.destRoot)
	}
}

// TestLiveZeroByteFile: croc treats empty files as metadata-only; the
// transfer must complete and materialize the empty file.
func TestLiveZeroByteFile(t *testing.T) {
	skipUnlessLive(t)
	relay := startLocalRelay(t)
	m, rec := newLiveManager(t, localRelayConfig(relay))

	src := filepath.Join(t.TempDir(), "empty.bin")
	if err := os.WriteFile(src, nil, 0o644); err != nil {
		t.Fatal(err)
	}
	_, out := croctool(t, relayEnv(relay), "send", src)
	code := sendCode(t, out)

	if _, err := m.Receive(code, ReceiveOptions{}); err != nil {
		t.Fatalf("Receive: %v", err)
	}
	done := rec.requireDone(t, 60*time.Second)

	info, err := os.Stat(filepath.Join(done.Dest, "empty.bin"))
	if err != nil {
		t.Fatalf("empty file not received: %v", err)
	}
	if info.Size() != 0 {
		t.Errorf("received %d bytes, want 0", info.Size())
	}
}

// TestLiveUnicodeFilename: non-ASCII names must survive the trip intact.
func TestLiveUnicodeFilename(t *testing.T) {
	skipUnlessLive(t)
	relay := startLocalRelay(t)
	m, rec := newLiveManager(t, localRelayConfig(relay))

	const name = "übung 名前 🎈.bin"
	dir := t.TempDir()
	src := filepath.Join(dir, name)
	payload := []byte("unicode payload")
	if err := os.WriteFile(src, payload, 0o644); err != nil {
		t.Fatal(err)
	}
	_, out := croctool(t, relayEnv(relay), "send", src)
	code := sendCode(t, out)

	if _, err := m.Receive(code, ReceiveOptions{}); err != nil {
		t.Fatalf("Receive: %v", err)
	}
	done := rec.requireDone(t, 60*time.Second)

	got, err := os.ReadFile(filepath.Join(done.Dest, name))
	if err != nil {
		t.Fatalf("unicode-named file not received: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Errorf("content differs")
	}
}

// TestLiveOverwriteCollision documents the collision semantics the app runs
// with (Overwrite: true): a same-named file with different content in the
// destination is reconciled to the sender's bytes, no prompt, no rename.
func TestLiveOverwriteCollision(t *testing.T) {
	skipUnlessLive(t)
	relay := startLocalRelay(t)
	m, rec := newLiveManager(t, localRelayConfig(relay))
	src, payload := makePayload(t, 256<<10)

	_, out := croctool(t, relayEnv(relay), "send", src)
	code := sendCode(t, out)

	// Pre-fill the per-code folder with a same-name, same-size file of
	// different bytes — the worst-case collision.
	dest := filepath.Join(m.destRoot, code)
	if err := os.MkdirAll(dest, 0o755); err != nil {
		t.Fatal(err)
	}
	other := make([]byte, len(payload))
	if err := os.WriteFile(filepath.Join(dest, "payload.bin"), other, 0o644); err != nil {
		t.Fatal(err)
	}

	if _, err := m.Receive(code, ReceiveOptions{}); err != nil {
		t.Fatalf("Receive: %v", err)
	}
	rec.requireDone(t, 60*time.Second)

	got, err := os.ReadFile(filepath.Join(dest, "payload.bin"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, payload) {
		t.Errorf("collision not overwritten: got %d differing bytes", len(got))
	}
}
