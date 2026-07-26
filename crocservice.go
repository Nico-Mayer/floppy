package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/schollz/croc/v10/src/croc"
	"github.com/schollz/croc/v10/src/models"
	"github.com/schollz/croc/v10/src/utils"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// CrocService runs croc transfers in-process with the library's context-aware
// client (croc.NewCtx): cancelling the context aborts the transfer and tells
// the peer. No worker processes involved — which is also what keeps mobile
// targets possible, where an app cannot re-exec itself. Progress is reported
// to the frontend via events: croc:code, croc:send:progress,
// croc:recv:progress, croc:sent, croc:received, croc:error.
type CrocService struct {
	mu            sync.Mutex
	dest          string
	sendCancel    context.CancelFunc
	recvCancel    context.CancelFunc
	sendCancelled bool
	recvCancelled bool
}

// emit is a variable so tests can capture events without a running app.
var emit = func(name, data string) {
	application.Get().Event.Emit(name, data)
}

func defaultCrocOptions() croc.Options {
	return croc.Options{
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
	}
}

// ServiceStartup pins the process working directory to the receive
// destination: the croc library always saves into the CWD, and nothing else
// in the app depends on it.
func (s *CrocService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	s.dest = filepath.Join(home, "Downloads")
	if err := os.MkdirAll(s.dest, 0o755); err != nil {
		return err
	}
	return os.Chdir(s.dest)
}

const progressPollInterval = 200 * time.Millisecond

// watchProgress polls the client's transfer counters and emits percentages
// until ctx is cancelled. croc has no progress callback API; the polled
// fields are written by the transfer goroutines without synchronization, so
// reads may be slightly stale — fine for a progress bar. Its maps are
// deliberately not touched (concurrent map reads can crash).
func watchProgress(ctx context.Context, client *croc.Client, event string) {
	go func() {
		ticker := time.NewTicker(progressPollInterval)
		defer ticker.Stop()
		last := ""
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				percent, ok := transferPercent(client)
				if !ok {
					continue
				}
				if p := strconv.Itoa(percent); p != last {
					last = p
					emit(event, p)
				}
			}
		}
	}()
}

// transferPercent derives overall progress: the sizes of the files already
// done (croc transfers them in order) plus the byte counter of the current
// one, which croc resets per file. For a sender it reports false until the
// transfer step has actually started (Step4 is only set on the sending side),
// so a sender still waiting for its receiver emits nothing — the frontend
// relies on the first progress event to switch from "waiting" to "sending".
// A receiver has no file list until the handshake, so the length check below
// already keeps it quiet before the transfer.
func transferPercent(c *croc.Client) (int, bool) {
	if c.Options.IsSender && !c.Step4FileTransferred {
		return 0, false
	}
	files := c.FilesToTransfer
	if len(files) == 0 {
		return 0, false
	}
	var total int64
	for _, f := range files {
		total += f.Size
	}
	if total <= 0 {
		return 0, false
	}
	idx := c.FilesToTransferCurrentNum
	var done int64
	for i := 0; i < idx && i < len(files); i++ {
		done += files[i].Size
	}
	if idx < len(files) {
		if sent := min(c.TotalSent, files[idx].Size); sent > 0 {
			done += sent
		}
	}
	return min(int(done*100/total), 100), true
}

// Send starts a send transfer for the given paths and returns immediately.
// The generated code phrase is emitted as a croc:code event, progress as
// croc:send:progress (percent), successful completion as croc:sent, failure
// as croc:error.
func (s *CrocService) Send(paths []string) error {
	if len(paths) == 0 {
		return fmt.Errorf("no files selected")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.sendCancel != nil {
		return fmt.Errorf("a send is already in progress")
	}

	options := defaultCrocOptions()
	options.IsSender = true
	options.SharedSecret = utils.GetRandomName()

	ctx, cancel := context.WithCancel(context.Background())
	client, err := croc.NewCtx(ctx, options)
	if err != nil {
		cancel()
		return err
	}
	filesInfo, emptyFolders, totalFolders, err := croc.GetFilesInfo(paths, false, false, nil)
	if err != nil {
		cancel()
		return err
	}

	s.sendCancel = cancel
	s.sendCancelled = false
	slog.Info("croc send: starting", "files", len(paths))

	// Everything validated — hand out the code phrase; the frontend treats
	// it as "waiting for receiver".
	emit("croc:code", options.SharedSecret)
	watchProgress(ctx, client, "croc:send:progress")

	go func() {
		err := client.Send(filesInfo, emptyFolders, totalFolders)

		s.mu.Lock()
		cancelled := s.sendCancelled
		s.sendCancel = nil
		s.mu.Unlock()
		cancel()

		switch {
		case cancelled:
			slog.Info("croc send: cancelled")
		case err != nil:
			slog.Error("croc send: failed", "err", err)
			emit("croc:error", "send failed: "+err.Error())
		default:
			slog.Info("croc send: completed")
			emit("croc:sent", "")
		}
	}()

	return nil
}

// Receive starts a receive transfer for the given code phrase; files are
// saved to the user's Downloads folder. Progress is emitted as
// croc:recv:progress (percent), completion as croc:received (with the
// destination directory as payload), failure as croc:error.
func (s *CrocService) Receive(code string) error {
	// Normalize "1234 word word" to "1234-word-word", like the croc CLI does.
	code = strings.Join(strings.Fields(code), "-")
	if code == "" {
		return fmt.Errorf("no code phrase given")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.recvCancel != nil {
		return fmt.Errorf("a receive is already in progress")
	}
	if s.dest == "" {
		return fmt.Errorf("receive destination not initialised")
	}

	options := defaultCrocOptions()
	options.IsSender = false
	options.SharedSecret = code

	ctx, cancel := context.WithCancel(context.Background())
	client, err := croc.NewCtx(ctx, options)
	if err != nil {
		cancel()
		return err
	}

	s.recvCancel = cancel
	s.recvCancelled = false
	dest := s.dest
	slog.Info("croc receive: starting", "dest", dest)

	watchProgress(ctx, client, "croc:recv:progress")

	go func() {
		err := client.Receive()

		s.mu.Lock()
		cancelled := s.recvCancelled
		s.recvCancel = nil
		s.mu.Unlock()
		cancel()

		switch {
		case cancelled:
			slog.Info("croc receive: cancelled")
		case err != nil:
			slog.Error("croc receive: failed", "err", err)
			emit("croc:error", "receive failed: "+err.Error())
		default:
			slog.Info("croc receive: completed", "dest", dest)
			emit("croc:received", dest)
		}
	}()

	return nil
}

// CancelSend aborts a running send transfer.
func (s *CrocService) CancelSend() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.sendCancel != nil {
		slog.Info("croc send: cancel requested")
		s.sendCancelled = true
		s.sendCancel()
	}
}

// CancelReceive aborts a running receive transfer. A partially received file
// may remain in the destination folder (croc reuses it to resume).
func (s *CrocService) CancelReceive() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.recvCancel != nil {
		slog.Info("croc receive: cancel requested")
		s.recvCancelled = true
		s.recvCancel()
	}
}

// ServiceShutdown aborts any running transfers when the app quits.
func (s *CrocService) ServiceShutdown() error {
	s.CancelSend()
	s.CancelReceive()
	return nil
}
