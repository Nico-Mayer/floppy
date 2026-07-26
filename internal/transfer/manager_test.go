package transfer

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const tick = 5 * time.Second // generous upper bound; everything is event-driven

func TestSendEmitsCodeProgressDoneInOrder(t *testing.T) {
	f := &fakeFactory{}
	m, rec := newTestManager(t, f)

	src := filepath.Join(t.TempDir(), "a.bin")
	if err := os.WriteFile(src, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	id, err := m.Send([]string{src}, SendOptions{})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}
	if id == "" {
		t.Fatal("Send returned an empty id")
	}

	code := rec.waitType(t, EventCode, tick)
	if code.ID != id || code.Kind != KindSend || code.Code == "" {
		t.Errorf("code event = %+v, want id %q, kind send, non-empty code", code, id)
	}

	p := f.peer(t, 0)
	waitClosed(t, p.started, tick, "peer to start")
	p.setSnap(snap{done: 5, total: 10, file: "a.bin", index: 1, count: 1})
	prog := rec.waitType(t, EventProgress, tick)
	if prog.ID != id || prog.Stats == nil || prog.Stats.Percent != 50 {
		t.Errorf("progress event = %+v, want id %q at 50%%", prog, id)
	}

	p.finish(nil)
	done := rec.waitType(t, EventDone, tick)
	if done.ID != id || done.Kind != KindSend || done.Dest != "" {
		t.Errorf("done event = %+v, want id %q, kind send, no dest", done, id)
	}

	// Completion must arrive as: ...progress(100%), done — and nothing after.
	evs := rec.all()
	last := evs[len(evs)-1]
	if last.Type != EventDone {
		t.Errorf("last event type = %d, want EventDone", last.Type)
	}
	beforeLast := evs[len(evs)-2]
	if beforeLast.Type != EventProgress || beforeLast.Stats.Percent != 100 {
		t.Errorf("event before done = %+v, want 100%% progress", beforeLast)
	}
}

func TestSendValidation(t *testing.T) {
	f := &fakeFactory{}
	m, _ := newTestManager(t, f)

	if _, err := m.Send(nil, SendOptions{}); !errors.Is(err, ErrNoFiles) {
		t.Errorf("empty paths: got %v, want ErrNoFiles", err)
	}
	if _, err := m.Send([]string{"x"}, SendOptions{Code: "abc"}); !errors.Is(err, ErrBadCode) {
		t.Errorf("short custom code: got %v, want ErrBadCode", err)
	}
}

func TestSendCustomCodeNormalized(t *testing.T) {
	f := &fakeFactory{}
	m, rec := newTestManager(t, f)

	if _, err := m.Send([]string{"x"}, SendOptions{Code: " 1234 pot ato "}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	code := rec.waitType(t, EventCode, tick)
	if code.Code != "1234-pot-ato" {
		t.Errorf("code = %q, want 1234-pot-ato", code.Code)
	}
	if got := f.req(t, 0).secret; got != "1234-pot-ato" {
		t.Errorf("peer secret = %q, want normalized code", got)
	}
}

func TestDoubleSendIsBusy(t *testing.T) {
	f := &fakeFactory{}
	m, _ := newTestManager(t, f)

	if _, err := m.Send([]string{"x"}, SendOptions{}); err != nil {
		t.Fatal(err)
	}
	if _, err := m.Send([]string{"y"}, SendOptions{}); !errors.Is(err, ErrBusy) {
		t.Errorf("second send: got %v, want ErrBusy", err)
	}
	// The other kind is independent.
	if _, err := m.Receive("123456", ReceiveOptions{}); err != nil {
		t.Errorf("receive while sending: %v", err)
	}
}

func TestPeerFactoryErrorFreesSlot(t *testing.T) {
	f := &fakeFactory{err: errors.New("croc exploded")}
	m, _ := newTestManager(t, f)

	if _, err := m.Send([]string{"x"}, SendOptions{}); err == nil || !strings.Contains(err.Error(), "croc exploded") {
		t.Fatalf("got %v, want factory error", err)
	}
	f.mu.Lock()
	f.err = nil
	f.mu.Unlock()
	if _, err := m.Send([]string{"x"}, SendOptions{}); err != nil {
		t.Errorf("send after failed setup: %v (slot leaked?)", err)
	}
}

// TestCancelAbsorbedByNextSend is the cancel contract: Cancel returns without
// waiting, the cancelled transfer emits no terminal event, and the next Send
// waits out the unwind instead of failing.
func TestCancelAbsorbedByNextSend(t *testing.T) {
	unwind := make(chan struct{})
	f := &fakeFactory{holdUnwind: unwind}
	m, rec := newTestManager(t, f)

	id1, err := m.Send([]string{"x"}, SendOptions{})
	if err != nil {
		t.Fatal(err)
	}
	waitClosed(t, f.peer(t, 0).started, tick, "first peer to start")
	firstDone := slotDone(m, KindSend)

	m.Cancel(KindSend) // must not block on the unwind

	// Second send: started while the first is still unwinding. Run it from a
	// goroutine and release the unwind afterwards; Send must only return
	// once the old slot is genuinely free.
	sent := make(chan error, 1)
	var id2 string
	go func() {
		var err error
		id2, err = m.Send([]string{"y"}, SendOptions{})
		sent <- err
	}()

	select {
	case err := <-sent:
		t.Fatalf("second send returned before the unwind finished: %v", err)
	case <-time.After(20 * time.Millisecond):
	}

	close(unwind)
	waitClosed(t, firstDone, tick, "first transfer to unwind")
	if err := <-sent; err != nil {
		t.Fatalf("second send after unwind: %v", err)
	}

	// The cancelled transfer said nothing terminal; the new one has its own id.
	for _, ev := range rec.all() {
		if ev.ID == id1 && (ev.Type == EventDone || ev.Type == EventFailed) {
			t.Errorf("cancelled transfer emitted terminal event %+v", ev)
		}
	}
	if id2 == "" || id2 == id1 {
		t.Errorf("second id = %q, want fresh non-empty id (first was %q)", id2, id1)
	}
}

func TestUnwindTimeoutIsErrUnwinding(t *testing.T) {
	unwind := make(chan struct{})
	defer close(unwind)
	f := &fakeFactory{holdUnwind: unwind}
	m, _ := newTestManager(t, f)
	m.cancelGrace = 10 * time.Millisecond

	if _, err := m.Send([]string{"x"}, SendOptions{}); err != nil {
		t.Fatal(err)
	}
	waitClosed(t, f.peer(t, 0).started, tick, "peer to start")
	m.Cancel(KindSend)

	if _, err := m.Send([]string{"y"}, SendOptions{}); !errors.Is(err, ErrUnwinding) {
		t.Errorf("send during held unwind: got %v, want ErrUnwinding", err)
	}
}

func TestReceiveValidation(t *testing.T) {
	f := &fakeFactory{}
	m, _ := newTestManager(t, f)

	for _, code := range []string{"", "   ", "abc", "a b"} {
		if _, err := m.Receive(code, ReceiveOptions{}); !errors.Is(err, ErrBadCode) {
			t.Errorf("Receive(%q): got %v, want ErrBadCode", code, err)
		}
	}
}

// TestReceiveOwnsCwdAndCleansUp is the F1 regression test: the CWD sits in
// the per-code folder during the transfer, is moved back out before cleanup,
// and a fruitless receive leaves no empty folder behind.
func TestReceiveOwnsCwdAndCleansUp(t *testing.T) {
	f := &fakeFactory{}
	m, rec := newTestManager(t, f)

	id, err := m.Receive("1234 pot ato", ReceiveOptions{})
	if err != nil {
		t.Fatalf("Receive: %v", err)
	}
	_ = id
	dest := filepath.Join(m.destRoot, "1234-pot-ato")
	if _, err := os.Stat(dest); err != nil {
		t.Fatalf("per-code folder not created: %v", err)
	}
	if cwd, _ := os.Getwd(); cwd != dest {
		t.Errorf("cwd during receive = %q, want %q", cwd, dest)
	}

	done := slotDone(m, KindReceive)
	m.Cancel(KindReceive)
	waitClosed(t, done, tick, "receive to unwind")

	if cwd, _ := os.Getwd(); cwd != m.destRoot {
		t.Errorf("cwd after receive = %q, want back at destRoot %q", cwd, m.destRoot)
	}
	if _, err := os.Stat(dest); !os.IsNotExist(err) {
		t.Errorf("empty per-code folder survived the cancelled receive: %v", err)
	}
	if evs := rec.byType(EventFailed); len(evs) > 0 {
		t.Errorf("cancelled receive emitted failure: %+v", evs)
	}
	if evs := rec.byType(EventDone); len(evs) > 0 {
		t.Errorf("cancelled receive emitted completion: %+v", evs)
	}
}

func TestReceiveKeepsPartialFiles(t *testing.T) {
	f := &fakeFactory{}
	m, _ := newTestManager(t, f)

	if _, err := m.Receive("123456", ReceiveOptions{}); err != nil {
		t.Fatal(err)
	}
	dest := filepath.Join(m.destRoot, "123456")
	// The bytes croc would have left behind mid-transfer.
	if err := os.WriteFile(filepath.Join(dest, "partial.bin"), []byte("half"), 0o644); err != nil {
		t.Fatal(err)
	}

	done := slotDone(m, KindReceive)
	m.Cancel(KindReceive)
	waitClosed(t, done, tick, "receive to unwind")

	if _, err := os.Stat(filepath.Join(dest, "partial.bin")); err != nil {
		t.Errorf("partial file removed — resume broken: %v", err)
	}
}

func TestReceiveFailureEmitsFailedEvent(t *testing.T) {
	f := &fakeFactory{}
	m, rec := newTestManager(t, f)

	id, err := m.Receive("123456", ReceiveOptions{})
	if err != nil {
		t.Fatal(err)
	}
	p := f.peer(t, 0)
	waitClosed(t, p.started, tick, "peer to start")
	p.finish(errors.New("relay fell over"))

	failed := rec.waitType(t, EventFailed, tick)
	if failed.ID != id || failed.Kind != KindReceive || failed.Err == nil {
		t.Errorf("failed event = %+v, want id %q with error", failed, id)
	}
	// The fruitless folder is gone on failure too.
	dest := filepath.Join(m.destRoot, "123456")
	done := slotDone(m, KindReceive)
	if done != nil {
		waitClosed(t, done, tick, "receive to unwind")
	}
	if _, err := os.Stat(dest); !os.IsNotExist(err) {
		t.Errorf("empty folder survived failed receive")
	}
}

func TestReceiveDoneCarriesDest(t *testing.T) {
	f := &fakeFactory{}
	m, rec := newTestManager(t, f)

	id, err := m.Receive("123456", ReceiveOptions{})
	if err != nil {
		t.Fatal(err)
	}
	p := f.peer(t, 0)
	waitClosed(t, p.started, tick, "peer to start")
	p.setSnap(snap{done: 4, total: 4, file: "x", index: 1, count: 1})
	p.finish(nil)

	done := rec.waitType(t, EventDone, tick)
	want := filepath.Join(m.destRoot, "123456")
	if done.ID != id || done.Dest != want {
		t.Errorf("done = %+v, want id %q dest %q", done, id, want)
	}
}

func TestUnwritableDestRoot(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root ignores permission bits")
	}
	f := &fakeFactory{}
	m, _ := newTestManager(t, f)
	if err := os.Chmod(m.destRoot, 0o555); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(m.destRoot, 0o755) })

	if _, err := m.Receive("123456", ReceiveOptions{}); err == nil {
		t.Error("Receive into unwritable root succeeded")
	}
	// The failed setup must not leave the slot claimed.
	if err := os.Chmod(m.destRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	if _, err := m.Receive("123456", ReceiveOptions{}); err != nil {
		t.Errorf("receive after failed setup: %v (slot leaked?)", err)
	}
}

func TestConcurrentSendAndReceive(t *testing.T) {
	f := &fakeFactory{}
	m, rec := newTestManager(t, f)

	sendID, err := m.Send([]string{"x"}, SendOptions{})
	if err != nil {
		t.Fatal(err)
	}
	recvID, err := m.Receive("123456", ReceiveOptions{})
	if err != nil {
		t.Fatal(err)
	}

	f.peer(t, 0).finish(nil)
	f.peer(t, 1).finish(nil)

	deadline := time.After(tick)
	for {
		dones := rec.byType(EventDone)
		if len(dones) == 2 {
			ids := map[string]Kind{dones[0].ID: dones[0].Kind, dones[1].ID: dones[1].Kind}
			if ids[sendID] != KindSend || ids[recvID] != KindReceive {
				t.Errorf("done events %+v, want one per transfer", dones)
			}
			return
		}
		select {
		case <-rec.wake:
		case <-deadline:
			t.Fatalf("only %d done events", len(dones))
		}
	}
}

// TestTerminalEventBeforeSlotFrees is the F5 regression test: by the time a
// new transfer can claim the slot, the old transfer's last event is already
// out, so events can never interleave across transfers of one kind.
func TestTerminalEventBeforeSlotFrees(t *testing.T) {
	f := &fakeFactory{}
	m, rec := newTestManager(t, f)

	id1, err := m.Send([]string{"x"}, SendOptions{})
	if err != nil {
		t.Fatal(err)
	}
	done := slotDone(m, KindSend)
	f.peer(t, 0).finish(nil)
	waitClosed(t, done, tick, "first send to finish")

	id2, err := m.Send([]string{"y"}, SendOptions{})
	if err != nil {
		t.Fatalf("send immediately after completion: %v", err)
	}

	var sawFirstDone bool
	for _, ev := range rec.all() {
		if ev.ID == id1 && ev.Type == EventDone {
			sawFirstDone = true
		}
		if ev.ID == id2 && !sawFirstDone {
			t.Fatalf("event for %q emitted before %q finished: %+v", id2, id1, rec.all())
		}
	}
	if !sawFirstDone {
		t.Fatal("first send never completed")
	}
}

func TestShutdownIdempotentAndBounded(t *testing.T) {
	unwind := make(chan struct{})
	f := &fakeFactory{holdUnwind: unwind}
	m, rec := newTestManager(t, f)

	if _, err := m.Send([]string{"x"}, SendOptions{}); err != nil {
		t.Fatal(err)
	}
	if _, err := m.Receive("123456", ReceiveOptions{}); err != nil {
		t.Fatal(err)
	}
	waitClosed(t, f.peer(t, 0).started, tick, "send to start")
	waitClosed(t, f.peer(t, 1).started, tick, "receive to start")

	// While croc is stuck unwinding, Shutdown must give up at its deadline
	// rather than stall the quit.
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	start := time.Now()
	if err := m.Shutdown(ctx); err != nil {
		t.Errorf("Shutdown: %v", err)
	}
	if took := time.Since(start); took > time.Second {
		t.Errorf("Shutdown took %s despite its deadline", took)
	}

	// Once the unwind can proceed, a repeated Shutdown waits it out fully…
	close(unwind)
	if err := m.Shutdown(context.Background()); err != nil {
		t.Errorf("second Shutdown: %v", err)
	}
	// …and a third has nothing left to do.
	if err := m.Shutdown(context.Background()); err != nil {
		t.Errorf("third Shutdown: %v", err)
	}
	for k := range kindCount {
		if done := slotDone(m, k); done != nil {
			waitClosed(t, done, tick, k.String()+" to unwind")
		}
	}
	for _, ev := range rec.all() {
		if ev.Type == EventDone || ev.Type == EventFailed {
			t.Errorf("shutdown transfer emitted terminal event %+v", ev)
		}
	}
}

func TestNewValidation(t *testing.T) {
	if _, err := New(Config{DestRoot: t.TempDir()}); err == nil {
		t.Error("New without Emit succeeded")
	}
	if _, err := New(Config{Emit: func(Event) {}}); err == nil {
		t.Error("New without DestRoot succeeded")
	}
}

func TestNormalizeCode(t *testing.T) {
	for in, want := range map[string]string{
		"1234-pot-ato":     "1234-pot-ato",
		" 1234  pot\tato ": "1234-pot-ato",
		"":                 "",
		"   ":              "",
	} {
		if got := normalizeCode(in); got != want {
			t.Errorf("normalizeCode(%q) = %q, want %q", in, got, want)
		}
	}
}
