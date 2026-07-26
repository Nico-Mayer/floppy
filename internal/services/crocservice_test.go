package services

import (
	"errors"
	"sync"
	"testing"

	"floppy/internal/transfer"
)

// wailsRecorder captures what the adapter would emit onto the Wails bus.
type wailsRecorder struct {
	mu    sync.Mutex
	names []string
	data  []any
}

func (r *wailsRecorder) emit(name string, data any) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.names = append(r.names, name)
	r.data = append(r.data, data)
}

func (r *wailsRecorder) single(t *testing.T) (string, any) {
	t.Helper()
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.names) != 1 {
		t.Fatalf("emitted %d events, want 1: %v", len(r.names), r.names)
	}
	return r.names[0], r.data[0]
}

// TestForwardMapping pins the transfer.Event → frontend event translation:
// names, payload shapes, and the send/receive split of progress and done.
func TestForwardMapping(t *testing.T) {
	stats := &transfer.Stats{Percent: 40, Sent: 4, Total: 10, File: "a.bin", FileIndex: 1, FileCount: 2}

	cases := []struct {
		name     string
		in       transfer.Event
		wantName string
		wantData any
	}{
		{
			name:     "code",
			in:       transfer.Event{ID: "send-1", Kind: transfer.KindSend, Type: transfer.EventCode, Code: "1234-a-b"},
			wantName: EventCode,
			wantData: CodeEvent{ID: "send-1", Kind: "send", Code: "1234-a-b"},
		},
		{
			name:     "send progress",
			in:       transfer.Event{ID: "send-1", Kind: transfer.KindSend, Type: transfer.EventProgress, Stats: stats},
			wantName: EventSendProgress,
			wantData: ProgressEvent{ID: "send-1", Kind: "send", Stats: *stats},
		},
		{
			name:     "receive progress",
			in:       transfer.Event{ID: "receive-2", Kind: transfer.KindReceive, Type: transfer.EventProgress, Stats: stats},
			wantName: EventRecvProgress,
			wantData: ProgressEvent{ID: "receive-2", Kind: "receive", Stats: *stats},
		},
		{
			name:     "sent",
			in:       transfer.Event{ID: "send-1", Kind: transfer.KindSend, Type: transfer.EventDone},
			wantName: EventSent,
			wantData: DoneEvent{ID: "send-1", Kind: "send"},
		},
		{
			name:     "received",
			in:       transfer.Event{ID: "receive-2", Kind: transfer.KindReceive, Type: transfer.EventDone, Dest: "/tmp/x"},
			wantName: EventReceived,
			wantData: DoneEvent{ID: "receive-2", Kind: "receive", Dest: "/tmp/x"},
		},
		{
			name:     "send failure",
			in:       transfer.Event{ID: "send-1", Kind: transfer.KindSend, Type: transfer.EventFailed, Err: errors.New("boom")},
			wantName: EventError,
			wantData: ErrorEvent{ID: "send-1", Kind: "send", Code: "send_failed", Message: "boom"},
		},
		{
			name:     "receive failure",
			in:       transfer.Event{ID: "receive-2", Kind: transfer.KindReceive, Type: transfer.EventFailed, Err: errors.New("boom")},
			wantName: EventError,
			wantData: ErrorEvent{ID: "receive-2", Kind: "receive", Code: "receive_failed", Message: "boom"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := &wailsRecorder{}
			s := &CrocService{emit: rec.emit}
			s.forward(tc.in)
			name, data := rec.single(t)
			if name != tc.wantName {
				t.Errorf("event name = %q, want %q", name, tc.wantName)
			}
			if data != tc.wantData {
				t.Errorf("payload = %+v, want %+v", data, tc.wantData)
			}
		})
	}
}

// TestMethodsBeforeStartup: binding calls must not panic if they somehow
// arrive before ServiceStartup.
func TestMethodsBeforeStartup(t *testing.T) {
	s := &CrocService{}
	if _, err := s.Send([]string{"x"}); !errors.Is(err, errNotStarted) {
		t.Errorf("Send: %v, want errNotStarted", err)
	}
	if _, err := s.Receive("123456"); !errors.Is(err, errNotStarted) {
		t.Errorf("Receive: %v, want errNotStarted", err)
	}
	s.CancelSend()
	s.CancelReceive()
	if err := s.ServiceShutdown(); err != nil {
		t.Errorf("ServiceShutdown: %v", err)
	}
}
