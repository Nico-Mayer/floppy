# app-shell-tauri

## MODIFIED Requirements

### Requirement: Mobile targets

The application SHALL build and run on iOS as well as Android, from the same Rust
core as desktop and at the same feature parity: quick share, trusted-device
pairing, image previews, completion notifications, and `floppy://` deep links.
The platform-agnostic behaviour specified for Android — launching on a read-only
filesystem, reaching the broker without a shell environment, resolving picked
files to readable paths, phone-bounded previews, foreground-gated notifications,
and mobile chrome — SHALL hold on iOS through the same shared code, not a second
implementation.

A transfer SHALL require the app to stay foregrounded on both platforms;
backgrounding it SHALL fail cleanly rather than hang.

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

#### Scenario: Deep link into an iOS build

- **WHEN** a `floppy://receive?code=…` link is opened on iOS
- **THEN** the app opens with the code prefilled and does not auto-start the transfer

#### Scenario: Phone to phone

- **WHEN** an iOS device and an Android device both run the app
- **THEN** a transfer completes between them in each direction
