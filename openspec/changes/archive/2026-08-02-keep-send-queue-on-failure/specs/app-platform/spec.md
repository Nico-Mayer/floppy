## MODIFIED Requirements

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

Every copy a pick creates SHALL be reachable by the app's own reaping, whoever made it. Where
a platform picker writes its own copy outside the directory the app reaps, the app SHALL bring
that copy under the reaped directory without moving bytes, and SHALL do so only when the file
is provably inside the app's own sandbox storage — a picked file that is not shall be left
where it is, so a picker that opens a file in place can never have the user's own file moved
out from under them.

Sandbox copies SHALL be reaped when the send queue is emptied and when a send completes. They
SHALL NOT be reaped when a send ends without sending — cancelled, declined, or failed — since
the queue survives all of those and its entries must keep pointing at readable files.

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

#### Scenario: A picker's own copy is brought under the reaped directory

- **WHEN** a platform picker returns a file it has already copied into the app's sandbox,
  outside the directory the app reaps
- **THEN** the app relocates it into the reaped directory without copying its bytes
- **AND** the file stays readable, sendable, and previewable

#### Scenario: A file outside the app's sandbox is never relocated

- **WHEN** a pick resolves to a path that is not inside the app's own cache or temporary
  storage
- **THEN** the app leaves it exactly where it is and sends it from there

#### Scenario: Sandbox copies are reaped

- **WHEN** the send queue is cleared, or a send completes
- **THEN** any sandbox copies made for that queue are deleted
- **AND** the completion summary still names what was sent, because it reads the queue's
  entries and not their bytes

#### Scenario: A cancelled send keeps its copies

- **WHEN** a send is cancelled
- **THEN** the queue is unchanged and its sandbox copies are still readable, so the same files
  can be sent again without re-picking them

#### Scenario: A failed send keeps its copies

- **WHEN** a send to a trusted device ends because the device is offline, turns it down, or the
  offer fails
- **THEN** the queue is unchanged and its sandbox copies are still readable, so pressing Send
  again works without re-picking anything

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
