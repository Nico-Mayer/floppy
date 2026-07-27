package services

import (
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type FileService struct{}

// FileEntry is one item queued for sending.
type FileEntry struct {
	Path string `json:"path"`
	Name string `json:"name"`
	// Size in bytes — for a directory, the sum of everything inside it.
	Size  int64 `json:"size"`
	IsDir bool  `json:"isDir"`
}

// SelectFiles opens a native file picker and returns the selected files.
//
// Windows' shell dialog has no combined mode — asking for directories there
// turns the whole dialog into a folder picker, and files become unselectable —
// so on Windows this offers files only and folders go through SelectFolder.
// macOS and Linux keep the one dialog that does both.
func (f *FileService) SelectFiles() ([]FileEntry, error) {
	paths, err := application.Get().Dialog.OpenFile().
		SetTitle("Select files to share").
		CanChooseFiles(true).
		CanChooseDirectories(runtime.GOOS != "windows").
		PromptForMultipleSelection()
	if err != nil {
		return nil, err
	}
	return f.Describe(paths), nil
}

// SelectFolder opens a native folder picker. Windows only ever returns one
// folder from it; the other platforms allow several.
func (f *FileService) SelectFolder() ([]FileEntry, error) {
	paths, err := application.Get().Dialog.OpenFile().
		SetTitle("Select a folder to share").
		CanChooseFiles(false).
		CanChooseDirectories(true).
		PromptForMultipleSelection()
	if err != nil {
		return nil, err
	}
	return f.Describe(paths), nil
}

// Describe resolves paths — the picker's, or ones dropped onto the window —
// into entries the send list can show sizes for. Paths that can no longer be
// read are dropped rather than failing the whole batch: a dropped file may be
// gone by the time this runs, and one bad path should not discard the rest.
func (f *FileService) Describe(paths []string) []FileEntry {
	entries := make([]FileEntry, 0, len(paths))
	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			slog.Warn("skipping unreadable path", "path", path, "err", err)
			continue
		}
		size := info.Size()
		if info.IsDir() {
			size = dirSize(path)
		}
		entries = append(entries, FileEntry{
			Path:  path,
			Name:  filepath.Base(path),
			Size:  size,
			IsDir: info.IsDir(),
		})
	}
	return entries
}

// dirSize adds up the regular files under root. Errors are skipped so an
// unreadable subfolder yields a low total instead of no total at all.
func dirSize(root string) int64 {
	var total int64
	_ = filepath.WalkDir(root, func(_ string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if info, err := d.Info(); err == nil {
			total += info.Size()
		}
		return nil
	})
	return total
}

// OpenPath opens a file or folder with the OS default handler
// (Finder/Explorer/xdg-open).
func (f *FileService) OpenPath(path string) error {
	if path == "" {
		return fmt.Errorf("no path given")
	}
	// The path is frontend-supplied; refuse anything that does not exist
	// rather than handing arbitrary strings to an OS launcher.
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("cannot open: %w", err)
	}
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", path)
	case "windows":
		cmd = exec.Command("explorer", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	// Reap the launcher: Start without Wait would leave one zombie process
	// per click until the app exits.
	go func() { _ = cmd.Wait() }()
	return nil
}
