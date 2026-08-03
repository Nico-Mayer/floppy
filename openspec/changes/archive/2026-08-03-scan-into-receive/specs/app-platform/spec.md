## MODIFIED Requirements

### Requirement: Plugin-backed platform services

The shell SHALL use Tauri plugins for OS integration rather than bespoke implementations:
notifications, deep links, file dialog, filesystem access, opening paths, logging,
single-instance ownership, haptic feedback, and barcode scanning.

Diagnostics SHALL reach the platform's log sink on every target: the core's tracing calls
SHALL be delivered to a real sink rather than dropped, and a build SHALL NOT be able to
silently lose them.

Haptic feedback SHALL be requested through the haptics plugin, with the capability
permissions the plugin needs on each mobile platform. It SHALL be attempted only on
coarse-pointer devices, and a failure to produce it SHALL never propagate to the caller: an
absent plugin, a denied permission, or hardware without a vibrator SHALL leave the
triggering action unaffected.

Reading a QR code with the camera SHALL go through the barcode-scanner plugin, on the mobile
targets where that plugin exists, and SHALL NOT be attempted on desktop. It SHALL run the camera
behind the webview rather than as a surface of its own, so the app keeps its own controls over it.
While it runs, the shell SHALL stop painting the region the camera shows through, and it SHALL go
back to painting normally the moment the camera stops, whatever ended it. The camera permission
each mobile platform requires SHALL be declared where that platform expects it: the plugin's
capability permissions, and a usage string on iOS written in the same plain first-person voice
as the app's other usage strings.

The app SHALL ask for the camera at the moment the user presses something that plainly needs
one, SHALL ask no more than once per attempt, and SHALL treat a refusal as an ordinary state:
it SHALL say the camera is off, SHALL offer the way to the platform's own settings, and SHALL
NOT leave the user without a way to finish what they were doing.

The plugin's API SHALL be wrapped in one module. No feature component SHALL import it directly,
for the same reason no component calls `invoke` directly. That module SHALL NOT be tied to one
flow: what the camera surface says, and what a decoded code is handed to, SHALL be supplied by
the caller, so more than one screen can point the same camera at a code.

Deep links SHALL be routed by shape and reported to the frontend as one event carrying which
shape arrived along with the code it carries, matching how transfer events carry their
direction. The router SHALL accept a receive link and a pairing link, and SHALL ignore any
other `floppy://` URL rather than guessing at it. Routing a link SHALL surface it for the user
to act on and SHALL NOT act on it: a receive link prefills the code and never starts a
transfer, and a pairing link fills the code field and never redeems it.

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

#### Scenario: Deep link fills a pairing code

- **WHEN** the app is opened via a `floppy://` pairing link
- **THEN** the event says it is a pairing link, the Devices code field opens with the code
  filled in, and nothing is redeemed

#### Scenario: An unrecognised floppy link is ignored

- **WHEN** a `floppy://` URL arrives that is neither a receive nor a pairing link
- **THEN** no event is emitted and no screen changes

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

#### Scenario: Scanning is permitted on every mobile target

- **WHEN** a debug build is produced for Android and for iOS
- **THEN** the scanner's permissions are present in the app's capabilities, iOS carries a camera
  usage string, and opening the camera works on both without a runtime permission error

#### Scenario: A refused camera is an ordinary state

- **WHEN** the user denies the camera permission
- **THEN** the app says the camera is off, offers the way to the platform's settings, and the
  user can still finish by typing the code

#### Scenario: The app is visible over the camera

- **WHEN** the camera is running on a phone build
- **THEN** it is visible behind the app's own controls, and the shell stops painting over it

#### Scenario: The shell comes back when the camera stops

- **WHEN** the camera stops, whether by a scan, a stop, or a failure
- **THEN** the shell paints normally again with no leftover transparency

#### Scenario: No scan attempted on desktop

- **WHEN** the same control is used in a desktop build
- **THEN** no scanner call is made and no camera permission is requested

#### Scenario: One scanner module serves every flow

- **WHEN** two different screens open the camera
- **THEN** both go through the one wrapper module, neither imports the plugin, and each supplies
  its own copy and its own meaning for a decoded code
