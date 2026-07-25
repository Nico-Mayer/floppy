package main

import "github.com/wailsapp/wails/v3/pkg/application"

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
