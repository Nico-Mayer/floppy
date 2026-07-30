# app-shell-tauri

## MODIFIED Requirements

### Requirement: Mobile targets

The application SHALL build and run on iOS and Android from the same Rust core, and complete a real file transfer on each. File access SHALL work under each platform's sandbox, and preview memory use SHALL be bounded for phone-class devices.

#### Scenario: iOS transfer end to end

- **WHEN** the app is built and run on iOS (device or simulator)
- **THEN** a send and a receive complete over iroh, the same as on desktop

#### Scenario: Android transfer end to end

- **WHEN** the app is built and run on Android (device or emulator)
- **THEN** a send and a receive complete over iroh, the same as on desktop

#### Scenario: Sandbox file access

- **WHEN** the user picks a file on iOS or Android
- **THEN** the picker yields a readable path (a sandbox copy where the platform hands back a `content://` URI or a security-scoped URL) that iroh can send and previews can decode

#### Scenario: Phone-bounded previews

- **WHEN** a large image is previewed on a phone
- **THEN** the decode stays within a phone-appropriate pixel/concurrency budget rather than the desktop budget, so a low-memory build is not killed
