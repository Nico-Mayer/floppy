package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// CrocService runs croc transfers by re-execing the app binary in worker
// mode (see crocworker.go) — croc is compiled in, no external CLI needed.
// Workers run as child processes so a transfer can be cancelled by killing
// them. Progress is reported to the frontend via events: croc:code,
// croc:sent, croc:received, croc:error.
type CrocService struct {
	mu            sync.Mutex
	send          *exec.Cmd
	recv          *exec.Cmd
	sendCancelled bool
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

// Send starts a send worker for the given paths and returns immediately.
// The generated code phrase is emitted as a croc:code event, successful
// completion as croc:sent, failure as croc:error.
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
	if err := cmd.Start(); err != nil {
		return err
	}
	s.send = cmd
	s.sendCancelled = false

	go func() {
		// The worker prints the code phrase to stdout as "CROC_CODE <phrase>".
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if code, ok := strings.CutPrefix(line, crocCodePrefix); ok {
				emit("croc:code", strings.TrimSpace(code))
			}
		}
		// The pipe closes when the process exits; Wait below reports real failures.
		_ = scanner.Err()

		err := cmd.Wait()
		s.mu.Lock()
		cancelled := s.sendCancelled
		s.send = nil
		s.mu.Unlock()

		if cancelled {
			return
		}
		if err != nil {
			emit("croc:error", "send failed: "+err.Error())
			return
		}
		emit("croc:sent", "")
	}()

	return nil
}

// CancelSend kills a running send worker.
func (s *CrocService) CancelSend() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.send != nil && s.send.Process != nil {
		s.sendCancelled = true
		_ = s.send.Process.Kill()
	}
}

// Receive starts a receive worker for the given code phrase; files are saved
// to the user's Downloads folder. Completion is emitted as croc:received
// (with the destination directory as payload), failure as croc:error.
func (s *CrocService) Receive(code string) error {
	code = strings.TrimSpace(code)
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
	if err := cmd.Start(); err != nil {
		return err
	}
	s.recv = cmd

	go func() {
		err := cmd.Wait()
		s.mu.Lock()
		s.recv = nil
		s.mu.Unlock()
		if err != nil {
			emit("croc:error", "receive failed: "+err.Error())
			return
		}
		emit("croc:received", dest)
	}()

	return nil
}
