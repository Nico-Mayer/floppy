## ADDED Requirements

### Requirement: The receive panel offers the camera beside the code field

On a build with a camera, the Receive panel SHALL offer one control that opens the camera,
beside the code field in the panel's anchored action zone. Pressing it SHALL open the same
camera surface adding a device uses, with no intervening step.

A code read from the camera SHALL fill the field and start the receive, because aiming a
camera at a code on another screen is a deliberate and specific act, and asking for a
second press after it would be asking the person to confirm what they just did.

The camera SHALL accept either shape a Floppy code can arrive in: a link the app renders in
a QR, or a bare code. Content that is neither SHALL be refused with one line saying it is
not a Floppy code, and a code that belongs to the other flow SHALL be refused with one line
naming the screen it belongs to. All three SHALL leave the camera live, because the fix is
to aim at something else.

A failure to start the receive, including the device already being busy, SHALL be reported
on the camera surface with the camera still live, in the same place a refused code is
reported.

Where there is no camera the control SHALL NOT be rendered, and no camera permission SHALL
be requested. Typing or pasting the code SHALL remain available and sufficient on every
platform, and SHALL be unchanged by the presence of the camera control.

#### Scenario: A scan starts the receive

- **WHEN** the user opens the camera from the Receive panel and it reads the code another
  device is showing
- **THEN** the code fills the field and the receive starts, without a further press

#### Scenario: A bare code is still accepted

- **WHEN** the camera reads a bare `1234-word-word-word` code on the Receive panel
- **THEN** it is treated as a transfer code and the receive starts

#### Scenario: A pairing code read on Receive says where it belongs

- **WHEN** the camera on the Receive panel reads the code from another device's pairing QR
- **THEN** one line says it is a code for adding a device and names the Devices screen, the
  camera stays live, and no receive is started

#### Scenario: Something that is not a Floppy code

- **WHEN** the camera on the Receive panel reads a QR that is not a Floppy code
- **THEN** one line says so, the camera stays live, and no receive is started

#### Scenario: A busy device is reported on the camera

- **WHEN** a scanned code cannot start a receive because a transfer is already running
- **THEN** the reason is shown on the camera surface with the camera still live, and nothing
  is reported behind a closed camera

#### Scenario: No camera, no control

- **WHEN** the Receive panel is shown on a build with no camera
- **THEN** no camera control is rendered, the code field and its button are unchanged, and no
  camera permission is requested

### Requirement: A code's QR carries a link to that code

The QR the Send panel shows SHALL encode a `floppy://` link carrying the code, not the bare
code, so that a reader outside the app has something it can act on and a reader inside the
app can tell which of the app's two kinds of code it just read.

The code SHALL still be shown as the bare phrase beside the QR, and the control that copies
it SHALL copy the bare code. A person reads a code out loud or types it into another
device; a URL is neither of those things, and nothing in the UI SHALL offer one to copy.

#### Scenario: The send QR encodes a receive link

- **WHEN** the Send panel shows its waiting state with a code
- **THEN** the QR encodes a `floppy://` receive link carrying that code

#### Scenario: The shown and copied code stay bare

- **WHEN** the user reads or copies the code from the Send panel's waiting state
- **THEN** the text beside the QR is the bare code and the copy control puts the bare code on
  the clipboard, never a URL

## MODIFIED Requirements

### Requirement: The receive code input carries an inline clear control

The code input SHALL show an inline clear control whenever it is non-empty, in both the
compact and the regular layout. The app SHALL NOT read the clipboard to pre-fill the code:
the value only ever comes from the user typing or pasting into the field, from a code the
user scanned with the camera, or from a link the user opened.

#### Scenario: Clear control follows input content

- **WHEN** the receive code input is non-empty in either compact or regular layout
- **THEN** an inline clear control is visible in the input, and activating it empties the field

#### Scenario: Clipboard is never read for the code

- **WHEN** the receive panel mounts, or the window regains focus, with a valid code on the clipboard
- **THEN** the input stays untouched
