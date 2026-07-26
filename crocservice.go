package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
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
	destRoot      string
	sendCancel    context.CancelFunc
	recvCancel    context.CancelFunc
	sendCancelled bool
	recvCancelled bool
}

// emit is a variable so tests can capture events without a running app.
var emit = func(name string, data any) {
	application.Get().Event.Emit(name, data)
}

// TransferStats is the payload of croc:send:progress and croc:recv:progress.
type TransferStats struct {
	Percent int   `json:"percent"`
	Sent    int64 `json:"sent"`
	Total   int64 `json:"total"`
	// Bps is the smoothed transfer rate; 0 until a rate can be measured.
	Bps int64 `json:"bps"`
	// ETA is the estimated number of seconds left, -1 while unknown.
	ETA int `json:"eta"`
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

// ServiceStartup resolves the receive destination root and parks the process
// working directory there. The croc library always saves into the CWD;
// Receive re-points it at a per-code subfolder, and nothing else in the app
// may depend on it.
func (s *CrocService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	s.destRoot = filepath.Join(home, "Downloads")
	if err := os.MkdirAll(s.destRoot, 0o755); err != nil {
		return err
	}
	return os.Chdir(s.destRoot)
}

const (
	progressPollInterval = 200 * time.Millisecond
	// Weight of the newest rate sample in the running average. Low enough
	// that a stalled or bursty poll doesn't make the readout jump around.
	rateSmoothing = 0.25
	// Emit at least this often once a transfer is running: the percentage
	// stands still for minutes on a large file, but speed and ETA must not.
	statsInterval = time.Second
)

// watchProgress polls the client's transfer counters and emits TransferStats
// until ctx is cancelled. croc has no progress callback API; the polled
// fields are written by the transfer goroutines without synchronization, so
// reads may be slightly stale — fine for a progress bar. Its maps are
// deliberately not touched (concurrent map reads can crash).
func watchProgress(ctx context.Context, client *croc.Client, event string) {
	go func() {
		ticker := time.NewTicker(progressPollInterval)
		defer ticker.Stop()
		var (
			bps         float64
			haveRate    bool
			lastSent    int64
			lastSample  time.Time
			lastEmit    time.Time
			lastPercent = -1
		)
		for {
			select {
			case <-ctx.Done():
				return
			case now := <-ticker.C:
				sent, total, ok := transferBytes(client)
				if !ok {
					continue
				}
				// The first sample only establishes a baseline: on a resumed
				// transfer `sent` starts at whatever the receiver already has,
				// and dividing that by one poll interval would invent a
				// gigabyte-per-second rate.
				if !lastSample.IsZero() {
					if dt := now.Sub(lastSample).Seconds(); dt > 0 {
						// Clamped: croc resets its byte counter per file, so a
						// file boundary can briefly look like negative progress.
						sample := max(float64(sent-lastSent)/dt, 0)
						if haveRate {
							bps += rateSmoothing * (sample - bps)
						} else {
							bps, haveRate = sample, true
						}
					}
				}
				lastSent, lastSample = sent, now

				percent := int(min(sent*100/total, 100))
				if percent == lastPercent && now.Sub(lastEmit) < statsInterval {
					continue
				}
				lastPercent, lastEmit = percent, now
				emit(event, TransferStats{
					Percent: percent,
					Sent:    sent,
					Total:   total,
					Bps:     int64(bps),
					ETA:     etaSeconds(total-sent, bps),
				})
			}
		}
	}()
}

// emitComplete reports a full progress bar. The poller stops with the
// transfer, so its last sample lands a few percent short of the end — without
// this the bar visibly freezes below 100% before the completion screen.
func emitComplete(c *croc.Client, event string) {
	_, total, ok := transferBytes(c)
	if !ok {
		return
	}
	emit(event, TransferStats{Percent: 100, Sent: total, Total: total, ETA: -1})
}

// etaSeconds estimates how long the remaining bytes will take at the given
// rate, returning -1 while the rate is too small to extrapolate from.
func etaSeconds(remaining int64, bps float64) int {
	if remaining <= 0 {
		return 0
	}
	if bps < 1 {
		return -1
	}
	return int(float64(remaining) / bps)
}

// transferBytes derives overall progress: the sizes of the files already
// done (croc transfers them in order) plus the byte counter of the current
// one, which croc resets per file. For a sender it reports false until the
// transfer step has actually started (Step4 is only set on the sending side),
// so a sender still waiting for its receiver emits nothing — the frontend
// relies on the first progress event to switch from "waiting" to "sending".
// A receiver has no file list until the handshake, so the length check below
// already keeps it quiet before the transfer.
func transferBytes(c *croc.Client) (done, total int64, ok bool) {
	if c.Options.IsSender && !c.Step4FileTransferred {
		return 0, 0, false
	}
	files := c.FilesToTransfer
	if len(files) == 0 {
		return 0, 0, false
	}
	for _, f := range files {
		total += f.Size
	}
	if total <= 0 {
		return 0, 0, false
	}
	idx := c.FilesToTransferCurrentNum
	for i := 0; i < idx && i < len(files); i++ {
		done += files[i].Size
	}
	if idx < len(files) {
		// On a resumed transfer croc only moves the chunks the receiver is
		// missing (CurrentFileChunks) and TotalSent counts just those bytes.
		// Credit the part the receiver already has — same accounting as
		// croc's own progress bar (setBar) — or a resume sits at 0% while it
		// finishes.
		credit := int64(0)
		if n := int64(len(c.CurrentFileChunks)); n > 0 {
			credit = max(files[idx].Size-n*models.TCP_BUFFER_SIZE/2, 0)
		}
		if sent := min(credit+c.TotalSent, files[idx].Size); sent > 0 {
			done += sent
		}
	}
	return min(done, total), total, true
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
			emitComplete(client, "croc:send:progress")
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
	if s.destRoot == "" {
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

	// Each receive gets its own folder named after the code phrase: repeats
	// of the same code resume into the same folder, different transfers never
	// collide, and croc's saves-into-CWD behaviour is scoped per transfer.
	dest := filepath.Join(s.destRoot, code)
	if err := os.MkdirAll(dest, 0o755); err != nil {
		cancel()
		return err
	}
	if err := os.Chdir(dest); err != nil {
		// Without the chdir croc would silently save into whatever the
		// previous receive's folder was.
		cancel()
		return err
	}

	s.recvCancel = cancel
	s.recvCancelled = false
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
			removeIfEmpty(dest)
		case err != nil:
			slog.Error("croc receive: failed", "err", err)
			emit("croc:error", "receive failed: "+err.Error())
			removeIfEmpty(dest)
		default:
			slog.Info("croc receive: completed", "dest", dest)
			emitComplete(client, "croc:recv:progress")
			emit("croc:received", dest)
		}
	}()

	return nil
}

// removeIfEmpty clears the per-code folder a receive created when nothing was
// saved into it — cancelled or failed attempts otherwise litter Downloads
// with empty folders. Partial files stay (croc resumes from them when the
// same code is retried).
func removeIfEmpty(dir string) {
	// os.Remove refuses to delete non-empty directories, which is exactly
	// the semantics needed here.
	_ = os.Remove(dir)
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
