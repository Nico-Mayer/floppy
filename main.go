package main

import (
	"embed"
	"flag"
	"io"
	"log"
	"os"
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
	services.RegisterPairingEvents()
}

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {
	// Trusted-device config (desktop slice): identity-dir isolates two
	// instances on one machine, seed-trust pre-trusts a peer without the
	// pairing UI, broker-url points at the rendezvous relay. Each reads a flag
	// (for direct binary runs) defaulting to an env var — `wails3 dev` cannot
	// forward flags to the app, but the environment passes straight through, so
	// `FLOPPY_IDENTITY_DIR=… wails3 dev` is the dev-mode path. Parsing is lenient:
	// the dev harness may hand the binary args of its own, and an unknown one
	// must not abort the GUI.
	fs := flag.NewFlagSet("floppy", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	identityDir := fs.String("identity-dir", os.Getenv("FLOPPY_IDENTITY_DIR"), "directory for the device identity + trust store (default: user config dir)")
	brokerURL := fs.String("broker-url", os.Getenv("FLOPPY_BROKER_URL"), "rendezvous broker WebSocket URL (default: ws://localhost:8080/ws)")
	seedTrust := fs.String("seed-trust", os.Getenv("FLOPPY_SEED_TRUST"), "dev: trust a peer at startup, \"<encoded-public-key>[,name]\"")
	_ = fs.Parse(os.Args[1:])

	// CrocService owns the transfer.Manager; PairingService drives it with
	// derived codes for trusted-device transfers — one Manager, shared.
	croc := &services.CrocService{}
	pairingSvc := services.NewPairingService(croc)
	pairingSvc.IdentityDir = *identityDir
	pairingSvc.BrokerURL = *brokerURL
	pairingSvc.SeedTrust = *seedTrust

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
			application.NewService(croc),
			application.NewService(pairingSvc),
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
