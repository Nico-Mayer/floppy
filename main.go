package main

import (
	"embed"
	"log"
	"runtime"

	"floppy/internal/services"
	"floppy/internal/stdio"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	// The Windows GUI build has no console, and croc turns a failed write to
	// the dead stderr handle into a failed transfer. Must run before any
	// transfer starts.
	stdio.SilenceUnusableStderr()

	// Event registration is not required, but the binding generator picks up
	// registered events and provides a strongly typed JS/TS API for them.
	// The croc:* events live with the service that emits them.
	services.RegisterEvents()
}

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {
	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	app := application.New(application.Options{
		Name:        "Floppy",
		Description: "A minimal app for sending and receiving files",
		Services: []application.Service{
			application.NewService(&services.FileService{}),
			application.NewService(&services.CrocService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Create a new window with the necessary options.
	// 'Title' is the title of the window.
	// 'Mac' options tailor the window when running on macOS.
	// 'BackgroundColour' is the background colour of the window.
	// 'URL' is the URL that will be loaded into the webview.
	win := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:          "Floppy",
		EnableFileDrop: true,
		// On Windows the native frame is dropped and the frontend TitleBar
		// renders its own window controls, matching the macOS hidden-inset
		// look. macOS keeps its native traffic lights.
		Frameless: runtime.GOOS == "windows",
		MinWidth:  500,
		MinHeight: 800,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	// Events
	win.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		app.Event.Emit(services.EventFilesDropped, event.Context().DroppedFiles())
	})

	// Run the application. This blocks until the application has been exited.
	err := app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
