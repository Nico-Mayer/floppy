package main

import (
	"fmt"
	"os/exec"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type FileService struct{}

// SelectFiles opens a native file picker and returns absolute paths
// of the selected files.
func (f *FileService) SelectFiles() ([]string, error) {
	return application.Get().Dialog.OpenFile().
		SetTitle("Select files to share").
		CanChooseFiles(true).
		CanChooseDirectories(false).
		PromptForMultipleSelection()
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
