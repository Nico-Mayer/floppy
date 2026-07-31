# app-shell-tauri

## MODIFIED Requirements

### Requirement: Mobile targets

The application SHALL build and run on iOS as well as Android, from the same Rust
core as desktop, at feature parity with the desktop build: quick share,
trusted-device pairing, image previews, completion notifications, and `floppy://`
deep links. File access SHALL work under the platform sandbox, and preview memory
use SHALL be bounded for phone-class devices. A transfer SHALL require the app to
stay foregrounded on both platforms; backgrounding it SHALL fail cleanly rather
than hang.

The platform-agnostic behaviour specified here — launching on a read-only
filesystem, reaching the broker without a shell environment, resolving picked
files to readable paths, phone-bounded previews, foreground-gated notifications,
and mobile chrome — SHALL hold on iOS through the same shared code, not a second
implementation.

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

#### Scenario: iOS transfer end to end

- **WHEN** the app is built and run on iOS (simulator or device)
- **THEN** a quick-share send and a receive each complete over iroh, the same as on desktop

#### Scenario: Local network access is declared

- **WHEN** two devices on the same network attempt a direct connection
- **THEN** the app has declared its local network use, so the direct path is available rather than silently degraded to relay-only

#### Scenario: Picking a file on iOS

- **WHEN** the user picks a file from the document picker or the photo library
- **THEN** the app resolves it through the same path-resolution shim used on Android
- **AND** the file is readable, sendable, and previewable without an iOS-specific code path

#### Scenario: Phone to phone

- **WHEN** an iOS device and an Android device both run the app
- **THEN** a transfer completes between them in each direction
