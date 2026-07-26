package main

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
func (f *FileService) SelectFiles() ([]FileEntry, error) {
	paths, err := application.Get().Dialog.OpenFile().
		SetTitle("Select files to share").
		CanChooseFiles(true).
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
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", path).Start()
	case "windows":
		return exec.Command("explorer", path).Start()
	default:
		return exec.Command("xdg-open", path).Start()
	}
}
