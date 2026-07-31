## MODIFIED Requirements

### Requirement: Plugin-backed platform services

The shell SHALL use Tauri plugins for OS integration rather than bespoke implementations: notifications, deep links, file dialog, filesystem access, opening paths, and haptic feedback.

Haptic feedback SHALL be requested through `tauri-plugin-haptics`, with the capability permissions the plugin needs on each mobile platform. It SHALL be attempted only on coarse-pointer devices, and a failure to produce it SHALL never propagate to the caller: an absent plugin, a denied permission, or hardware without a vibrator SHALL leave the triggering action unaffected.

#### Scenario: Completion notification while backgrounded

- **WHEN** a transfer completes while the app window is not focused
- **THEN** an OS notification is shown via `tauri-plugin-notification`, and no notification is shown when the window is focused

#### Scenario: Open received folder

- **WHEN** the user acts to open a completed receive's destination
- **THEN** the folder opens via `tauri-plugin-opener`

#### Scenario: Deep link opens a receive

- **WHEN** the app is opened via a registered deep link carrying a transfer code
- **THEN** `tauri-plugin-deep-link` delivers it to the core and a receive is initiated

#### Scenario: Haptic feedback on a phone

- **WHEN** a transfer completes on a phone
- **THEN** haptic feedback is produced via `tauri-plugin-haptics`

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
