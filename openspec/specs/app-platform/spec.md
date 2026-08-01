# app-platform

## Purpose

The Tauri 2 application platform: a Rust core that exposes transfer and pairing
operations as typed commands and events, a SvelteKit static-SPA frontend, plugin-backed
OS integration, image previews, and desktop plus mobile (iOS/Android) targets built from
one core.

## Requirements

### Requirement: Tauri 2 application shell

The application SHALL run on Tauri 2 with a Rust core. The core SHALL expose transfer and
pairing operations as Tauri commands and SHALL emit their progress and outcomes over the
Tauri event system.

#### Scenario: App launches

- **WHEN** the application is launched on a supported desktop platform
- **THEN** the Tauri window opens, loads the SvelteKit frontend, and the Rust core is ready to
  accept commands

#### Scenario: Frontend invokes a core command

- **WHEN** the frontend calls a bound command (e.g. send, receive, cancel) via `invoke()`
- **THEN** the Rust core executes it and resolves the promise with the result or a typed error

### Requirement: One instance owns the app data

On desktop the application SHALL run as a single instance. A second launch SHALL surface
the running window rather than start a second core, and anything the second launch carried
(such as a deep link) SHALL be delivered to the instance already running.

#### Scenario: A deep link arrives while the app is open

- **WHEN** a `floppy://` link is opened on a platform that launches a new process for it
- **THEN** the running window is surfaced and receives the link, and no second core,
  transfer endpoint, or blob store is opened

### Requirement: The webview runs under a content security policy

The webview SHALL be served with a content security policy that confines it to app-local
resources: no remote script, style, image, font, or network destination. The policy SHALL
admit the core's own preview protocol and the IPC channel, and the development policy MAY
additionally admit the local dev server so hot reload works.

#### Scenario: Remote content is refused

- **WHEN** the loaded page attempts to fetch a script or connect to a host that is not the
  app itself or the IPC channel
- **THEN** the request is blocked by the policy

#### Scenario: Previews and IPC still work under the policy

- **WHEN** the app runs a normal transfer with queued image previews
- **THEN** previews render and every command and event works, in both a dev and a bundled build

### Requirement: Capabilities grant only what the webview uses

Capability files SHALL grant the webview only permissions it actually exercises, SHALL be
listed explicitly in the app configuration, and SHALL be constrained to the platforms where
they mean something. A plugin used only from Rust SHALL NOT be granted to the webview.

#### Scenario: A Rust-only plugin is not exposed

- **WHEN** a plugin's API is called only from Rust
- **THEN** no capability grants its commands to the webview, and the app still works

#### Scenario: Desktop-only permissions are not granted on a phone

- **WHEN** the app is built for Android or iOS
- **THEN** window-control permissions are absent from the granted capabilities

### Requirement: SvelteKit static-SPA frontend

The frontend SHALL be a SvelteKit application built with the static adapter as a
single-page app and served by Tauri, with no server runtime at any point.

#### Scenario: Static SPA build serves in the webview

- **WHEN** the frontend is built with the static adapter and loaded by the Tauri webview
- **THEN** client-side routing works and no server runtime is required

### Requirement: The IPC contract is generated, never hand-written

The command surface, the event vocabulary, and the shared types SHALL be declared once in
Rust and exported to a generated TypeScript bindings module. The generated file SHALL be
the artifact the frontend consumes: it SHALL NOT be hand-edited, and no command name,
event name, or payload type SHALL be written out a second time on the frontend.

Generation SHALL run on every debug build and SHALL also be reachable headlessly from the
test suite, so the checked-in bindings can be regenerated and verified without launching
the app. A mobile or release build SHALL NOT attempt to write bindings into the source
tree, because its working directory may be read-only.

The frontend SHALL wrap each generated command so a failed `Result` throws rather than
returning a value the caller could mistake for success.

#### Scenario: Adding a command needs no frontend edit

- **WHEN** a command is added to the Rust builder and a debug build is run
- **THEN** the generated bindings gain it, and the frontend can call it without anyone writing
  its name or its types by hand

#### Scenario: Bindings regenerate headlessly

- **WHEN** the binding-export test runs
- **THEN** the checked-in bindings file is regenerated, with no window opened and no
  frontend build required

#### Scenario: A read-only working directory does not block startup

- **WHEN** a build starts on a device whose working directory is read-only
- **THEN** the app launches and reaches the webview, and no startup step attempts to write
  generated bindings into the source tree

### Requirement: One transfer event vocabulary for both directions

A send and a receive SHALL share one set of transfer events, distinguished by a `kind`
field of `"send"` or `"receive"` rather than by separate per-direction event names. Every
transfer event payload SHALL carry the transfer's `id` and its `kind`, so a listener can
attribute an event without tracking which command it came from.

A cancelled transfer SHALL emit no terminal event of any kind.

#### Scenario: Frontend subscribes to progress

- **WHEN** the frontend listens for progress events during a send
- **THEN** it receives payloads carrying `id`, `kind`, and the transferred/total byte and
  file counts, with `kind` identifying the direction

#### Scenario: One listener serves both directions

- **WHEN** a send and a receive are each run
- **THEN** the same event is emitted for both, differing only in its `kind`, and no
  direction-specific event name exists

#### Scenario: Cancelled transfer emits no terminal event

- **WHEN** a transfer is cancelled
- **THEN** no done and no error event is emitted for it

### Requirement: Every failure carries a machine-readable code

No failure that reaches the frontend SHALL require matching on message text.

An error event raised for a running transfer SHALL carry both a machine-readable error
code and the user-facing text to show. A command that fails SHALL fail with a typed error
whose variant identifies the cause; the variants known to the frontend SHALL be part of the
generated IPC contract. Error message wording on either side SHALL be free to change
without breaking the frontend.

#### Scenario: A failure is classifiable

- **WHEN** a transfer fails mid-flight
- **THEN** the error event carries a typed error code alongside the message shown to the user

#### Scenario: A refused start is distinguishable

- **WHEN** a start is refused because the device is busy, the previous transfer is still
  stopping, no files were selected, or the code was invalid
- **THEN** the command fails with the typed variant for that case rather than emitting a
  transfer error event

#### Scenario: A refused start reaches the frontend the same way on every path

- **WHEN** a start is refused for a send to a trusted device, or for accepting an offer
- **THEN** the command fails with the same typed variant a code-phrase start would produce,
  not with prose describing it

#### Scenario: Copy is not contract

- **WHEN** the wording of an error message is changed in the core or in the frontend
- **THEN** no failure is misclassified as a result

### Requirement: Plugin-backed platform services

The shell SHALL use Tauri plugins for OS integration rather than bespoke implementations:
notifications, deep links, file dialog, filesystem access, opening paths, logging,
single-instance ownership, and haptic feedback.

Diagnostics SHALL reach the platform's log sink on every target: the core's tracing calls
SHALL be delivered to a real sink rather than dropped, and a build SHALL NOT be able to
silently lose them.

Haptic feedback SHALL be requested through the haptics plugin, with the capability
permissions the plugin needs on each mobile platform. It SHALL be attempted only on
coarse-pointer devices, and a failure to produce it SHALL never propagate to the caller: an
absent plugin, a denied permission, or hardware without a vibrator SHALL leave the
triggering action unaffected.

File picking SHALL go through the dialog plugin from the frontend and drag-drop through
native webview events; neither SHALL be an app command or event.

#### Scenario: Completion notification while backgrounded

- **WHEN** a transfer completes while the app window is not focused
- **THEN** an OS notification is shown via the notification plugin, and no notification is
  shown when the window is focused

#### Scenario: Open received folder

- **WHEN** the user acts to open a completed receive's destination
- **THEN** the folder opens via the opener plugin

#### Scenario: Deep link opens a receive

- **WHEN** the app is opened via a registered deep link carrying a transfer code
- **THEN** the deep-link plugin delivers it to the core and the code is surfaced for a receive

#### Scenario: A core log line is visible on the platform

- **WHEN** the core logs at info level on desktop, Android, or iOS
- **THEN** the line appears in that platform's log output

#### Scenario: Haptic feedback on a phone

- **WHEN** a transfer completes on a phone
- **THEN** haptic feedback is produced via the haptics plugin

#### Scenario: Haptics are permitted on every mobile target

- **WHEN** a debug build is produced for Android and for iOS
- **THEN** the haptics permissions are present in the app's capabilities and feedback works on
  both without a runtime permission error

#### Scenario: Haptics failure is swallowed

- **WHEN** haptic feedback cannot be produced, for any reason
- **THEN** the action that requested it completes normally, no error reaches the user, and the
  transfer path is unaffected

#### Scenario: No haptics attempted on desktop

- **WHEN** the same events occur in a desktop build
- **THEN** no haptic call is made

### Requirement: Image previews served by the core

The shell SHALL serve queued-file image previews through a core-registered protocol backed
by the Rust `image` crate, so the frontend requests a preview by URL and never reads image
bytes itself.

#### Scenario: Queued image gets a thumbnail

- **WHEN** the frontend requests a preview for a supported queued image
- **THEN** the core returns a downscaled thumbnail (or streams the original where decoding is
  not worthwhile)

#### Scenario: Phone-bounded previews

- **WHEN** a large image is previewed on a phone
- **THEN** the decode stays within a phone-appropriate pixel and concurrency budget rather than
  the desktop budget, so a low-memory build is not killed

### Requirement: Mobile targets

The application SHALL build and run on iOS as well as Android, from the same Rust core as
desktop, at feature parity with the desktop build: quick share, trusted-device pairing,
image previews, completion notifications, and `floppy://` deep links. File access SHALL
work under the platform sandbox. A transfer SHALL require the app to stay foregrounded on
both platforms; backgrounding it SHALL fail cleanly rather than hang.

The platform-agnostic behaviour specified here — reaching the broker without a shell
environment, resolving picked files to readable paths, foreground-gated notifications, and
mobile chrome — SHALL hold on iOS through the same shared code, not a second
implementation.

#### Scenario: Android transfer end to end

- **WHEN** the app is built and run on Android (device or emulator)
- **THEN** a quick-share send and a receive each complete over iroh, the same as on desktop

#### Scenario: iOS transfer end to end

- **WHEN** the app is built and run on iOS (simulator or device)
- **THEN** a quick-share send and a receive each complete over iroh, the same as on desktop

#### Scenario: Phone to phone

- **WHEN** an iOS device and an Android device both run the app
- **THEN** a transfer completes between them in each direction

#### Scenario: Rendezvous without a shell environment

- **WHEN** the app runs as a packaged mobile app, with no environment variables set
- **THEN** it contacts the deployed rendezvous broker rather than a loopback address
- **AND** a development build still honours an environment override

#### Scenario: Picking a file the platform hands back as a URI

- **WHEN** the user picks a file and the platform returns a `content://` URI rather than a path
- **THEN** the app resolves it to a readable path in its own sandbox
- **AND** the queue shows the file's real display name and size
- **AND** iroh sends it and previews decode it through the same code path as a desktop file

#### Scenario: Picking a file on iOS

- **WHEN** the user picks a file from the document picker or the photo library
- **THEN** the app resolves it through the same path-resolution shim used on Android
- **AND** the file is readable, sendable, and previewable without an iOS-specific code path

#### Scenario: Sandbox copies are reaped

- **WHEN** the send queue is cleared or the transfer ends
- **THEN** any sandbox copies made for that queue are deleted

#### Scenario: Notification while the app is backgrounded

- **WHEN** a transfer completes while the app is not in the foreground
- **THEN** a completion notification is shown
- **AND** no notification is shown when the app is in the foreground

#### Scenario: Deep link into a mobile build

- **WHEN** a `floppy://receive?code=…` link is opened on Android
- **THEN** the app opens with the code prefilled and does not auto-start the transfer

#### Scenario: Local network access is declared

- **WHEN** two devices on the same network attempt a direct connection
- **THEN** the app has declared its local network use, so the direct path is available rather
  than silently degraded to relay-only

#### Scenario: Mobile chrome

- **WHEN** the app renders on a phone
- **THEN** content is inset clear of the status bar, notch, and gesture areas
- **AND** desktop-only window controls are not shown
