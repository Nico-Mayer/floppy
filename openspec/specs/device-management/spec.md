# device-management Specification

## Purpose

TBD - created by archiving change redesign-device-pairing. Update Purpose after archive.

## Requirements

### Requirement: Dedicated Devices page

The app SHALL provide a dedicated Devices page reachable from top-level navigation
(not nested inside Settings). The page SHALL show this device's editable self-name
at the top, the list of paired devices below (each with its shown label), and a way
to add a device. Removing a device from the list SHALL revoke local trust so that
device can no longer send without a code.

#### Scenario: Devices page is its own destination

- **WHEN** the user opens the app navigation
- **THEN** Devices is a top-level entry, separate from Settings

#### Scenario: Self-name is editable from the page

- **WHEN** the user edits this device's self-name on the Devices page
- **THEN** the new name is saved and used for future pairings and transfers

#### Scenario: Remove revokes trust

- **WHEN** the user removes a paired device from the list
- **THEN** that device is no longer trusted and a code-free send from it is refused

### Requirement: Symmetric add-a-device flow

The Add-a-device screen SHALL be symmetric: it SHALL simultaneously present this
device's own pairing QR and short code AND offer a way to consume the other
device's code (scan or type). The user SHALL NOT have to choose an "initiator" or
"opener" role. On a platform with a camera the screen SHALL offer scanning; when no
camera is available or permission is denied, entering the code by hand SHALL remain
available and sufficient. The short code SHALL use the same
`<4 digits>-<word>-<word>-<word>` format as transfer codes.

#### Scenario: One screen serves both directions

- **WHEN** the user opens Add a device
- **THEN** the screen shows this device's QR and code and also a scan / code-entry control

#### Scenario: Scanning consumes the other device's code

- **WHEN** the user scans the QR shown on another device
- **THEN** pairing begins toward that device without any role selection

#### Scenario: Typed code is a full fallback

- **WHEN** no camera is available and the user types the other device's code
- **THEN** pairing proceeds the same as it would from a scan

### Requirement: One-tap confirmation without naming

Redeeming a code (by scan or type) SHALL count as the redeemer's consent and SHALL
NOT prompt the redeemer for a confirmation or a name. The device that showed the
code SHALL present exactly one confirmation of the incoming request, identifying
the peer by its advertised self-name (e.g. "Add NicoPC?"). The confirmation SHALL
NOT require the user to enter a name; it MAY offer an inline rename. When the
request arrived via a scanned QR the confirmation SHALL NOT require an SAS
comparison; when it arrived via a typed code the confirmation SHALL show the SAS
for the user to compare.

#### Scenario: Redeemer is not asked to confirm or name

- **WHEN** a device redeems a code
- **THEN** it proceeds to link without showing a confirmation dialog or a name prompt

#### Scenario: Shower confirms once, by name

- **WHEN** a pairing request reaches the device that showed the code
- **THEN** it shows a single confirmation naming the peer, with no required name input

#### Scenario: SAS shown only for typed codes

- **WHEN** the request originated from a typed code rather than a scanned QR
- **THEN** the confirmation displays the SAS to compare before accepting

### Requirement: Local rename of a paired device

The user SHALL be able to rename a paired device on the Devices page. A rename SHALL
be a local override that always wins over the peer's advertised self-name and SHALL
never be sent to the peer. Clearing the override SHALL let the device fall back to
the peer's advertised self-name.

#### Scenario: Rename overrides the advertised name

- **WHEN** the user renames a paired device locally
- **THEN** the list shows the local name even after the peer advertises a different self-name

#### Scenario: Rename is not shared

- **WHEN** a device is renamed locally
- **THEN** the peer's own list is unaffected

### Requirement: No pasted links in the pairing UI

The pairing UI SHALL NOT ask the user to paste a link, and SHALL NOT present the
pairing secret as a URL to copy. Adding a device SHALL be done by scanning a QR or
entering a code. User-visible copy SHALL use "code", "your devices", "paired", and
"Remove", and SHALL NOT use "pair link", "key", or "trusted".

#### Scenario: No paste-a-link affordance

- **WHEN** the user is adding a device
- **THEN** the UI offers scan or code entry and never a paste-a-link field

#### Scenario: Consistent vocabulary

- **WHEN** any pairing-related string is shown
- **THEN** it uses the device/code/paired vocabulary and avoids link/key/trusted wording

### Requirement: Entry to pairing from the send flow

The Send target picker SHALL provide a way into the Add-a-device flow, so a user
choosing where to send can reach device pairing directly. This entry SHALL route to
the Devices add flow rather than opening a separate pasted-link dialog.

#### Scenario: Send picker links to pairing

- **WHEN** the user opens the Send target picker
- **THEN** it offers an action that opens the Add-a-device flow on the Devices page
