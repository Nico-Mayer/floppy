# device-management

## Purpose

The Devices screen and the add-a-device flow: this device's editable self-name, the list of
paired devices with local renames and trust revocation, and one symmetric screen that shows
this device's code and consumes another's without the user picking a role.
## Requirements
### Requirement: Dedicated Devices page

The app SHALL provide a dedicated Devices page reachable from top-level navigation
(not nested inside Settings). The page SHALL show this device's editable self-name
at the top, the list of paired devices below (each with its shown label), and a way
to add a device. Removing a device from the list SHALL revoke local trust so that
device can no longer send without a code.

Removal SHALL require a confirmation before trust is revoked, however the remove action was
reached, because revoking trust cannot be undone without pairing again. How the action is
reached on each pointer type — swipe on touch, a button with a mouse — belongs to
`interaction`.

#### Scenario: Devices page is its own destination

- **WHEN** the user opens the app navigation
- **THEN** Devices is a top-level entry, separate from Settings

#### Scenario: Self-name is editable from the page

- **WHEN** the user edits this device's self-name on the Devices page
- **THEN** the new name is saved and used for future pairings and transfers

#### Scenario: Remove revokes trust

- **WHEN** the user removes a paired device from the list
- **THEN** that device is no longer trusted and a code-free send from it is refused

#### Scenario: Removal still confirms before revoking

- **WHEN** the user activates the remove action, however it was reached
- **THEN** a confirmation appears, and trust is revoked only once it is confirmed

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

### Requirement: Code entry clears after an attempt

The code-entry field on the Add-a-device screen SHALL be cleared once an attempt
finishes, whether it succeeded or failed. A pairing code is single-use and expires
after a bounded timeout, so a code that has just failed cannot succeed on a retry:
the other device has to show a new one. Leaving the spent code in the field invites
the user to press connect again and hit the same error.

The error itself SHALL still be shown, so clearing the field never costs the user the
explanation of what went wrong.

#### Scenario: A failed attempt empties the field

- **WHEN** entering a code fails for any reason, including the self-pair refusals
- **THEN** the field is empty and the error is shown

#### Scenario: A successful attempt empties the field

- **WHEN** entering a code adds the other device
- **THEN** the field is empty, ready for the next one

### Requirement: One-tap confirmation without naming

Redeeming a code (by scan or type) SHALL count as the redeemer's consent and SHALL
NOT prompt the redeemer for a confirmation or a name. The device that showed the
code SHALL present exactly one confirmation of the incoming request, identifying
the peer by its advertised self-name (e.g. "Add NicoPC?"). The confirmation SHALL
NOT require the user to enter a name; it MAY offer an inline rename. When the
request arrived via a scanned QR the confirmation SHALL NOT require an SAS
comparison; when it arrived via a typed code the confirmation SHALL show the SAS
for the user to compare.

A request whose peer turns out to be this same device SHALL NOT reach the
confirmation at all. The user SHALL never be asked to approve, name, or compare an
SAS for a pairing the app has already established cannot happen, so no confirmation
dialog SHALL appear and no device row SHALL be added to the list.

The refusal SHALL be reported on the side the user acted on, which is the side that
scanned or typed the code, as an ordinary error in the add-a-device flow. It SHALL
be worded for a normal person and SHALL say which of the two situations happened:

- The code belongs to this same device, e.g. "That's this device's own code."
- Two devices are running the same identity, e.g. "These devices have the same
  identity, so they can't be added."

The copy SHALL follow the existing pairing vocabulary: it SHALL NOT say "trusted",
"key", "fingerprint", or "pair link", and SHALL NOT use an em dash.

#### Scenario: Redeemer is not asked to confirm or name

- **WHEN** a device redeems a code
- **THEN** it proceeds to link without showing a confirmation dialog or a name prompt

#### Scenario: Shower confirms once, by name

- **WHEN** a pairing request reaches the device that showed the code
- **THEN** it shows a single confirmation naming the peer, with no required name input

#### Scenario: SAS shown only for typed codes

- **WHEN** the request originated from a typed code rather than a scanned QR
- **THEN** the confirmation displays the SAS to compare before accepting

#### Scenario: A device's own code raises no confirmation

- **WHEN** the user enters or scans the code this same device is showing
- **THEN** no confirmation dialog appears, no row is added to the device list, and the add-a-device flow shows an error saying it is this device's own code

#### Scenario: A shared identity raises no confirmation

- **WHEN** the user pairs two devices that are running a copy of the same identity
- **THEN** no confirmation dialog appears on either device, and the device that entered the code shows an error saying the two devices have the same identity

#### Scenario: Refusal copy stays in the pairing vocabulary

- **WHEN** either self-pair error is shown
- **THEN** its text avoids "trusted", "key", "fingerprint", "pair link", and em dashes

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

The Send screen SHALL offer a way into the Add-a-device flow while no device is
paired, so a first-time user learns from the send flow that sending without a code
exists. This entry SHALL route to the Devices add flow rather than opening a separate
pasted-link dialog.

With no devices paired there is nothing to choose between, so the target picker SHALL
NOT be rendered and the entry SHALL take its place in the Send action row.

Once at least one device is paired the entry SHALL be gone: the picker listing the
paired devices is itself the evidence that the capability exists, and Devices is a
top-level destination reachable from the navigation. The Send screen SHALL NOT carry a
standing shortcut to pairing.

The entry SHALL NOT be an option inside the target picker in either case: a picker's
options are values, so a command placed among them would be a value to assistive
technology and unreachable by keyboard navigation.

#### Scenario: Send picker links to pairing

- **WHEN** the Send panel is idle with files queued and no devices are paired
- **THEN** the action row shows an entry that opens the Add-a-device flow on the
  Devices page, in place of the target picker, and no one-option picker is rendered

#### Scenario: The entry retires once a device is paired

- **WHEN** the Send panel is idle with files queued and at least one device is paired
- **THEN** the action row shows the target picker and the Send button only, with no
  pairing shortcut of its own

#### Scenario: Pairing is never an option inside the picker

- **WHEN** the user opens the Send target picker
- **THEN** its option list contains send targets only, and no Add-a-device command

#### Scenario: Send does not move between the two states

- **WHEN** the first device is paired while the Send panel is idle with files queued
- **THEN** the entry is replaced by the picker in the same slot and the Send button
  stays where it was

