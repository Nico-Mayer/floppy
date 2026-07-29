# app-shell-tauri

## ADDED Requirements

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

The application SHALL build and run on iOS and Android in addition to macOS, Windows, and Linux, using the mobile-capable file picker for selecting files.

#### Scenario: Select a file on mobile

- **WHEN** the user picks a file on iOS or Android
- **THEN** `tauri-plugin-dialog` returns a readable path (or sandbox copy) the core can transfer and preview
