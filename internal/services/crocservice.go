package services

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"time"

	"floppy/internal/transfer"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// CrocService is the Wails adapter around transfer.Manager: it exposes the
// manager's methods as bindings and translates its events into the frontend
// event vocabulary. No transfer logic lives here.
type CrocService struct {
	manager *transfer.Manager
	// emit publishes one frontend event; swapped by tests. Set on startup.
	emit func(name string, data any)
}

// Frontend event names — the wire contract (see MIGRATION.md for payloads).
const (
	EventFilesDropped = "files-dropped"
	EventCode         = "croc:code"
	EventSendProgress = "croc:send:progress"
	EventRecvProgress = "croc:recv:progress"
	EventSent         = "croc:sent"
	EventReceived     = "croc:received"
	EventError        = "croc:error"
)

// CodeEvent is the payload of croc:code.
type CodeEvent struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
	Code string `json:"code"`
}

// ProgressEvent is the payload of croc:send:progress and croc:recv:progress.
type ProgressEvent struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
	transfer.Stats
}

// DoneEvent is the payload of croc:sent and croc:received; Dest is set for
// receives only.
type DoneEvent struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
	Dest string `json:"dest,omitempty"`
}

// ErrorEvent is the payload of croc:error. Code is machine-readable
// ("send_failed" | "receive_failed"), Message human-readable.
type ErrorEvent struct {
	ID      string `json:"id"`
	Kind    string `json:"kind"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// RegisterEvents declares every event this service emits, so the bindings
// generator produces a typed frontend API for them. Call before creating
// the application.
func RegisterEvents() {
	application.RegisterEvent[[]string](EventFilesDropped)
	application.RegisterEvent[CodeEvent](EventCode)
	application.RegisterEvent[ProgressEvent](EventSendProgress)
	application.RegisterEvent[ProgressEvent](EventRecvProgress)
	application.RegisterEvent[DoneEvent](EventSent)
	application.RegisterEvent[DoneEvent](EventReceived)
	application.RegisterEvent[ErrorEvent](EventError)
}

// ServiceStartup wires the manager to the user's Downloads folder and the
// Wails event bus.
func (s *CrocService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	if s.emit == nil {
		s.emit = func(name string, data any) {
			application.Get().Event.Emit(name, data)
		}
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	m, err := transfer.New(transfer.Config{
		DestRoot: filepath.Join(home, "Downloads"),
		Emit:     s.forward,
	})
	if err != nil {
		return err
	}
	s.manager = m
	return nil
}

// forward translates one transfer.Event into its frontend event.
func (s *CrocService) forward(ev transfer.Event) {
	kind := ev.Kind.String()
	switch ev.Type {
	case transfer.EventCode:
		s.emit(EventCode, CodeEvent{ID: ev.ID, Kind: kind, Code: ev.Code})
	case transfer.EventProgress:
		name := EventSendProgress
		if ev.Kind == transfer.KindReceive {
			name = EventRecvProgress
		}
		s.emit(name, ProgressEvent{ID: ev.ID, Kind: kind, Stats: *ev.Stats})
	case transfer.EventDone:
		if ev.Kind == transfer.KindSend {
			s.emit(EventSent, DoneEvent{ID: ev.ID, Kind: kind})
		} else {
			s.emit(EventReceived, DoneEvent{ID: ev.ID, Kind: kind, Dest: ev.Dest})
		}
	case transfer.EventFailed:
		s.emit(EventError, ErrorEvent{
			ID:      ev.ID,
			Kind:    kind,
			Code:    kind + "_failed",
			Message: ev.Err.Error(),
		})
	}
}

// errNotStarted covers binding calls arriving before ServiceStartup ran (or
// after it failed) — Wails sequences startup first, so this is a guard rail,
// not an expected path.
var errNotStarted = errors.New("transfer service not started")

// Send starts a send transfer for the given paths and returns its transfer
// ID; the code phrase follows as a croc:code event.
func (s *CrocService) Send(paths []string) (string, error) {
	if s.manager == nil {
		return "", errNotStarted
	}
	return s.manager.Send(paths, transfer.SendOptions{})
}

// Receive starts a receive transfer for the given code phrase and returns
// its transfer ID; files land in ~/Downloads/<code>/.
func (s *CrocService) Receive(code string) (string, error) {
	if s.manager == nil {
		return "", errNotStarted
	}
	return s.manager.Receive(code, transfer.ReceiveOptions{})
}

// SendCoded starts a send with a caller-supplied code phrase instead of a
// random one — the trusted-device path, where both peers derive the same code
// from their pairing. Otherwise identical to Send.
func (s *CrocService) SendCoded(paths []string, code string) (string, error) {
	if s.manager == nil {
		return "", errNotStarted
	}
	return s.manager.Send(paths, transfer.SendOptions{Code: code})
}

// ReceiveCoded is Receive under a name that reads symmetrically with SendCoded
// at the trusted-device call site; the code is the derived phrase.
func (s *CrocService) ReceiveCoded(code string) (string, error) {
	return s.Receive(code)
}

// CancelSend aborts the running send, returning immediately (the unwind is
// absorbed by the next transfer).
func (s *CrocService) CancelSend() {
	if s.manager != nil {
		s.manager.Cancel(transfer.KindSend)
	}
}

// CancelReceive aborts the running receive; a partially received file stays
// in the per-code folder, and retrying the same code resumes from it.
func (s *CrocService) CancelReceive() {
	if s.manager != nil {
		s.manager.Cancel(transfer.KindReceive)
	}
}

// ServiceShutdown aborts any running transfers when the app quits, giving
// croc a short window to say goodbye to its peer — quitting must not stall
// behind a slow unwind.
func (s *CrocService) ServiceShutdown() error {
	if s.manager == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return s.manager.Shutdown(ctx)
}
