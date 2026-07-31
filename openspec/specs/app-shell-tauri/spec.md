# app-shell-tauri

## Purpose

The Tauri 2 application shell: a Rust core exposing transfer operations as commands
and events, a SvelteKit static-SPA frontend, plugin-backed OS integration, image
previews, and desktop + mobile (iOS/Android) targets.

## Requirements

### Requirement: Tauri 2 application shell

The application SHALL run on Tauri 2 with a Rust core, replacing the Wails 3 shell. The core SHALL expose transfer operations as Tauri commands and SHALL emit transfer events over the Tauri event system.

#### Scenario: App launches on Tauri

- **WHEN** the application is launched on a supported desktop platform
- **THEN** the Tauri window opens, loads the SvelteKit frontend, and the Rust core is ready to accept commands

#### Scenario: Frontend invokes a core command

- **WHEN** the frontend calls a bound command (e.g. send, receive, cancel) via `invoke()`
- **THEN** the Rust core executes it and resolves the promise with the result or a typed error

### Requirement: SvelteKit frontend

The frontend SHALL be a SvelteKit application built as a static SPA and served by Tauri. Existing shadcn-svelte components and the transfer UI SHALL be re-added to the SvelteKit tree, preserving their behavior.

#### Scenario: Static SPA build serves in the webview

- **WHEN** the frontend is built with the static adapter and loaded by the Tauri webview
- **THEN** client-side routing works and no server runtime is required

### Requirement: Preserved event vocabulary

The core SHALL emit transfer events using the existing `croc:*` names and payload shapes (`id`, `kind`, progress/done/error fields) so frontend logic ports with minimal change. Cancelled transfers SHALL emit no terminal event.

#### Scenario: Frontend subscribes to progress

- **WHEN** the frontend calls `listen('croc:send:progress', …)` during a send
- **THEN** it receives payloads carrying `id`, `kind`, `done`, `total`, `file`, `index`, and `count`

#### Scenario: Cancelled transfer emits no terminal event

- **WHEN** a transfer is cancelled
- **THEN** no `croc:sent`, `croc:received`, or `croc:error` event is emitted for it

### Requirement: Plugin-backed platform services

The shell SHALL use Tauri plugins for OS integration rather than bespoke implementations: notifications, deep links, file dialog, filesystem access, and opening paths.

#### Scenario: Completion notification while backgrounded

- **WHEN** a transfer completes while the app window is not focused
- **THEN** an OS notification is shown via `tauri-plugin-notification`, and no notification is shown when the window is focused

#### Scenario: Open received folder

- **WHEN** the user acts to open a completed receive's destination
- **THEN** the folder opens via `tauri-plugin-opener`

#### Scenario: Deep link opens a receive

- **WHEN** the app is opened via a registered deep link carrying a transfer code
- **THEN** `tauri-plugin-deep-link` delivers it to the core and a receive is initiated

### Requirement: Image previews via the image crate

The shell SHALL serve queued-file image previews through a core route backed by the Rust `image` crate, replacing the Go stdlib preview path while keeping the frontend's preview URL contract.

#### Scenario: Queued image gets a thumbnail

- **WHEN** the frontend requests a preview for a supported queued image
- **THEN** the core returns a downscaled thumbnail (or streams the original where decoding is not worthwhile)

### Requirement: Mobile targets

The application SHALL build and run on Android from the same Rust core as
desktop, at feature parity with the desktop build: quick share, trusted-device
pairing, image previews, completion notifications, and `floppy://` deep links.
File access SHALL work under the platform sandbox, and preview memory use SHALL
be bounded for phone-class devices. A transfer SHALL require the app to stay
foregrounded; backgrounding it SHALL fail cleanly rather than hang.

iOS is delivered by the `ios-port` change and inherits the platform-agnostic
behaviour specified here.

#### Scenario: Debug build launches on a phone

- **WHEN** a debug build starts on a device whose working directory is read-only
- **THEN** the app launches and reaches the webview
- **AND** no startup step attempts to write generated bindings into the source tree

#### Scenario: Android transfer end to end

- **WHEN** the app is built and run on Android (device or emulator)
- **THEN** a quick-share send and a receive each complete over iroh, the same as on desktop

#### Scenario: Rendezvous without a shell environment

- **WHEN** the app runs as a packaged mobile app, with no environment variables set
- **THEN** it contacts the deployed rendezvous broker rather than a loopback address
- **AND** a development build still honours an environment override

#### Scenario: Received files land in a findable place

- **WHEN** a transfer completes on Android
- **THEN** the files are written under the platform's download directory for the app
- **AND** the destination reported to the user matches where they were written

#### Scenario: Picking a file the platform hands back as a URI

- **WHEN** the user picks a file and the platform returns a `content://` URI rather than a path
- **THEN** the app resolves it to a readable path in its own sandbox
- **AND** the queue shows the file's real display name and size
- **AND** iroh sends it and previews decode it through the same code path as a desktop file

#### Scenario: Sandbox copies are reaped

- **WHEN** the send queue is cleared or the transfer ends
- **THEN** any sandbox copies made for that queue are deleted

#### Scenario: Phone-bounded previews

- **WHEN** a large image is previewed on a phone
- **THEN** the decode stays within a phone-appropriate pixel and concurrency budget rather than the desktop budget, so a low-memory build is not killed

#### Scenario: Notification while the app is backgrounded

- **WHEN** a transfer completes while the app is not in the foreground
- **THEN** a completion notification is shown
- **AND** no notification is shown when the app is in the foreground

#### Scenario: Deep link into a mobile build

- **WHEN** a `floppy://receive?code=…` link is opened on Android
- **THEN** the app opens with the code prefilled and does not auto-start the transfer

#### Scenario: Mobile chrome

- **WHEN** the app renders on a phone
- **THEN** content is inset clear of the status bar, notch, and gesture areas
- **AND** desktop-only window controls are not shown
- **AND** the hardware back button navigates within the app instead of closing it

#### Scenario: Select a file on mobile

- **WHEN** the user picks a file on iOS or Android
- **THEN** `tauri-plugin-dialog` returns a readable path (or sandbox copy) the core can transfer and preview

