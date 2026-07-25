package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// CrocService runs croc transfers by re-execing the app binary in worker
// mode (see crocworker.go) — croc is compiled in, no external CLI needed.
// Workers run as child processes so a transfer can be cancelled by killing
// them. Progress is reported to the frontend via events: croc:code,
// croc:send:progress, croc:recv:progress, croc:sent, croc:received,
// croc:error.
type CrocService struct {
	mu            sync.Mutex
	send          *exec.Cmd
	recv          *exec.Cmd
	sendCancelled bool
	recvCancelled bool
}

func emit(name, data string) {
	application.Get().Event.Emit(name, data)
}

func workerCommand(args ...string) (*exec.Cmd, error) {
	exe, err := os.Executable()
	if err != nil {
		return nil, err
	}
	return exec.Command(exe, append([]string{"croc-worker"}, args...)...), nil
}

// scanCRLines splits on \r as well as \n — croc redraws its progress bar
// with carriage returns, so a plain line scanner would never see updates.
func scanCRLines(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	if i := bytes.IndexAny(data, "\r\n"); i >= 0 {
		return i + 1, data[:i], nil
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}

var percentRe = regexp.MustCompile(`(\d{1,3})%`)

// watchStderr parses a worker's stderr: percentages from croc's progress bar
// are emitted as progressEvent (deduplicated), and the last non-progress line
// is returned on the channel once the stream ends, as error detail.
func watchStderr(r io.Reader, progressEvent string) <-chan string {
	ch := make(chan string, 1)
	go func() {
		scanner := bufio.NewScanner(r)
		scanner.Split(scanCRLines)
		lastLine := ""
		lastPercent := ""
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" {
				continue
			}
			if m := percentRe.FindStringSubmatch(line); m != nil {
				// croc also draws "Hashing <file>" bars while preparing large
				// files — that's not transfer progress, don't forward it.
				if !strings.Contains(line, "Hashing") && m[1] != lastPercent {
					lastPercent = m[1]
					emit(progressEvent, m[1])
				}
				continue
			}
			lastLine = line
		}
		_ = scanner.Err()
		ch <- lastLine
	}()
	return ch
}

func failureMessage(action string, err error, detail string) string {
	msg := action + " failed: " + err.Error()
	if detail != "" {
		msg += " — " + detail
	}
	return msg
}

// Send starts a send worker for the given paths and returns immediately.
// The generated code phrase is emitted as a croc:code event, progress as
// croc:send:progress (percent), successful completion as croc:sent, failure
// as croc:error.
func (s *CrocService) Send(paths []string) error {
	if len(paths) == 0 {
		return fmt.Errorf("no files selected")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.send != nil {
		return fmt.Errorf("a send is already in progress")
	}

	cmd, err := workerCommand(append([]string{"send"}, paths...)...)
	if err != nil {
		return err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	s.send = cmd
	s.sendCancelled = false
	slog.Info("croc send: worker started", "pid", cmd.Process.Pid, "files", len(paths))

	detailCh := watchStderr(stderr, "croc:send:progress")

	go func() {
		// The worker prints the code phrase to stdout as "CROC_CODE <phrase>".
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if code, ok := strings.CutPrefix(line, crocCodePrefix); ok {
				slog.Info("croc send: code phrase ready, waiting for receiver")
				emit("croc:code", strings.TrimSpace(code))
			}
		}
		_ = scanner.Err()
		detail := <-detailCh

		err := cmd.Wait()
		s.mu.Lock()
		cancelled := s.sendCancelled
		s.send = nil
		s.mu.Unlock()

		if cancelled {
			slog.Info("croc send: cancelled")
			return
		}
		if err != nil {
			msg := failureMessage("send", err, detail)
			slog.Error("croc send: worker failed", "err", err, "detail", detail)
			emit("croc:error", msg)
			return
		}
		slog.Info("croc send: completed")
		emit("croc:sent", "")
	}()

	return nil
}

// CancelSend kills a running send worker.
func (s *CrocService) CancelSend() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.send != nil && s.send.Process != nil {
		slog.Info("croc send: cancel requested", "pid", s.send.Process.Pid)
		s.sendCancelled = true
		_ = s.send.Process.Kill()
	}
}

// CancelReceive kills a running receive worker. A partially received file
// may remain in the destination folder (croc reuses it to resume).
func (s *CrocService) CancelReceive() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.recv != nil && s.recv.Process != nil {
		slog.Info("croc receive: cancel requested", "pid", s.recv.Process.Pid)
		s.recvCancelled = true
		_ = s.recv.Process.Kill()
	}
}

// ServiceShutdown kills any running workers when the app quits, so no
// orphaned transfer processes are left behind.
func (s *CrocService) ServiceShutdown() error {
	s.CancelSend()
	s.CancelReceive()
	return nil
}

// Receive starts a receive worker for the given code phrase; files are saved
// to the user's Downloads folder. Progress is emitted as croc:recv:progress
// (percent), completion as croc:received (with the destination directory as
// payload), failure as croc:error.
func (s *CrocService) Receive(code string) error {
	// Normalize "1234 word word" to "1234-word-word", like the croc CLI does.
	code = strings.Join(strings.Fields(code), "-")
	if code == "" {
		return fmt.Errorf("no code phrase given")
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	dest := filepath.Join(home, "Downloads")

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.recv != nil {
		return fmt.Errorf("a receive is already in progress")
	}

	cmd, err := workerCommand("recv", dest)
	if err != nil {
		return err
	}
	// Pass the code via env instead of argv so it doesn't show up in the
	// process list.
	cmd.Env = append(os.Environ(), "CROC_SECRET="+code)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	s.recv = cmd
	s.recvCancelled = false
	slog.Info("croc receive: worker started", "pid", cmd.Process.Pid, "dest", dest)

	detailCh := watchStderr(stderr, "croc:recv:progress")

	go func() {
		detail := <-detailCh
		err := cmd.Wait()
		s.mu.Lock()
		cancelled := s.recvCancelled
		s.recv = nil
		s.mu.Unlock()
		if cancelled {
			slog.Info("croc receive: cancelled")
			return
		}
		if err != nil {
			msg := failureMessage("receive", err, detail)
			slog.Error("croc receive: worker failed", "err", err, "detail", detail)
			emit("croc:error", msg)
			return
		}
		slog.Info("croc receive: completed", "dest", dest)
		emit("croc:received", dest)
	}()

	return nil
}
