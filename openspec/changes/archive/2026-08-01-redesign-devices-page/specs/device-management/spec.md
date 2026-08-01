## MODIFIED Requirements

### Requirement: Dedicated Devices page

The app SHALL provide a dedicated Devices page reachable from top-level navigation
(not nested inside Settings). The page SHALL show this device's editable self-name
at the top, the list of paired devices below it, and a way to add a device.
Removing a device from the list SHALL revoke local trust so that device can no
longer send without a code.

The page's order SHALL be: this device, then this device's code, then the paired
devices. The code card SHALL sit directly under this device's name, because the name
and the code are both answers to "what is this device to the others". The list SHALL
NOT be pushed below any control that only matters while adding a device.

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

#### Scenario: The page reads name, code, devices

- **WHEN** the Devices page renders
- **THEN** this device's name is first, its code card is directly under that, and the paired
  devices follow

#### Scenario: Remove revokes trust

- **WHEN** the user removes a paired device from the list
- **THEN** that device is no longer trusted and a code-free send from it is refused

#### Scenario: Removal still confirms before revoking

- **WHEN** the user activates the remove action, however it was reached
- **THEN** a confirmation appears, and trust is revoked only once it is confirmed

### Requirement: Symmetric add-a-device flow

Adding a device SHALL be symmetric: the Devices page SHALL simultaneously present this
device's own pairing QR and short code AND offer a way to consume the other device's code
(scan or type). The user SHALL NOT have to choose an "initiator" or "opener" role. On a
platform with a camera scanning SHALL be offered; when no camera is available or permission
is denied, entering the code by hand SHALL remain available and sufficient. The short code
SHALL use the same `<4 digits>-<word>-<word>-<word>` format as transfer codes.

This device's code SHALL live on the page itself, under this device's name. Consuming the
other device's code MAY live in a surface the page opens, because it is the half that needs
a keyboard; the entry point to it SHALL be on the page, so both directions are visible
without opening anything.

The page SHALL ask for exactly one code as it loads, so the card is ready the moment the
user uncovers it, and SHALL NOT ask again on its own. A failed request SHALL NOT be retried
in a loop. Refreshing the page SHALL NOT replace a live code, which the other device may be
part-way through typing.

The card SHALL hold one height across every state it has — waiting for a code, showing one,
and after one is spent — and the controls beside it SHALL be present in all three. A code
arriving, being replaced, or being used up SHALL move nothing else on the page.

The shown code and its QR SHALL read as one object, with no gap opened between them, and the
code's line SHALL have room reserved for the longest code the app can generate. Wrapping into
space that was already there is acceptable; growing the card, or clipping the code, is not.

When a pairing completes while the code-entry surface is open, that surface SHALL close
itself, because the device the user was adding is now a row in the list behind it.

A step that takes over the camera MAY replace the code-entry surface's contents while it is
open. Leaving that step SHALL return to the field.

#### Scenario: One screen serves both directions

- **WHEN** the user opens the Devices page
- **THEN** this device's QR and code are on the page, and a control to use the other device's code is too

#### Scenario: The page asks for one code, once

- **WHEN** the Devices page loads
- **THEN** exactly one code is requested, and it is covered until the user uncovers it

#### Scenario: A failed request is not retried in a loop

- **WHEN** asking for a code fails
- **THEN** the failure is reported once and no further request is made on its own

#### Scenario: A pull does not replace a live code

- **WHEN** the user pulls to refresh while a code is showing
- **THEN** the same code is still showing, with its countdown where it was

#### Scenario: The card does not move as its state changes

- **WHEN** a code arrives, is replaced, and runs out
- **THEN** the card is the same height throughout, the controls beside it stay in place, and
  nothing below it moves

#### Scenario: The longest possible code does not break the card

- **WHEN** the shown code is the longest this app can generate, on the narrowest supported width
- **THEN** the code stays legible at no less than 16px on a coarse pointer, the card does not grow
  or overflow, and nothing below it moves

#### Scenario: Scanning consumes the other device's code

- **WHEN** the user scans the QR shown on another device
- **THEN** pairing begins toward that device without any role selection

#### Scenario: Typed code is a full fallback

- **WHEN** no camera is available and the user types the other device's code
- **THEN** pairing proceeds the same as it would from a scan

#### Scenario: The entry surface closes on success

- **WHEN** a pairing completes while the code-entry surface is open
- **THEN** the surface closes and the new device is visible in the list

## ADDED Requirements

### Requirement: Scanning has a slot in the add flow before it is wired up

The code-entry surface SHALL carry a scan entry beside the code field, and that entry
SHALL open a scan step, from the day the surface is built rather than once a camera is
wired up. The step SHALL be shaped so the scanner drops into it later without the
surrounding flow being re-laid out, and SHALL offer the way back to typing the code.

The entry SHALL be offered on a phone or tablet build only, and SHALL be absent on
desktop, where typing the code is the whole story. The signal SHALL be the platform the
app is running on, NOT the window width: a desktop window dragged narrow is still a
desktop with no camera worth pointing at another screen. Where it is offered it SHALL
occupy its own full-width row above the code field, because scanning is the thing you do
holding a phone and it should not be a glyph beside a text field.

Until a scanner is behind it, the step SHALL NOT show anything that imitates a camera:
no viewfinder image, no placeholder video, no simulated detection. It SHALL NOT ask for
camera permission, because a permission spent to then show nothing is a permission spent
on a lie.

Typing the code SHALL remain a complete path to pairing, reachable without the scan step
being opened at all.

#### Scenario: The entry and the step exist on a phone build

- **WHEN** the code-entry surface renders on a phone or tablet build
- **THEN** a scan entry occupies its own row above the code field, and activating it opens a scan step with a way back to typing

#### Scenario: Desktop is code only

- **WHEN** the code-entry surface renders on a desktop build, at any window width
- **THEN** no scan entry is rendered and the code field is the only way to use the other device's code

#### Scenario: The step fakes no camera

- **WHEN** the scan step renders with no scanner wired up
- **THEN** it shows no camera image or imitation of one, and no camera permission is requested

#### Scenario: Typing never depends on the scan step

- **WHEN** the user types a code in the add-a-device flow
- **THEN** pairing proceeds without the scan step being opened at all

### Requirement: An open rename closes when focus leaves it

A rename field opened in place, for this device or for a paired device, SHALL close when
focus leaves it, and SHALL keep what was typed: clicking or tabbing away is a commit, the
way renaming a file is. An empty name SHALL still be treated as a cancel, since blanking a
label is never the intent.

Focus moving to the field's own cancel or save control SHALL NOT count as leaving, so those
two still decide what happens.

A rename SHALL NOT be left open behind a click somewhere else. An editor nobody is looking
at is still holding its row, and the next thing the user does reads as broken.

#### Scenario: Clicking away keeps the new name

- **WHEN** the user types a new name and clicks somewhere else on the page
- **THEN** the field closes and the new name is saved

#### Scenario: Cancel still cancels

- **WHEN** the user presses the field's cancel control
- **THEN** the field closes and the name is unchanged

#### Scenario: An emptied field closes without saving

- **WHEN** the user clears the field and focus leaves it
- **THEN** the field closes and the old name is kept

### Requirement: This device does not look like one of the paired devices

This device's own name SHALL be presented in a visibly different shape from a row in the
paired list: it is a different kind of thing (the label you are known by, not a device you
can send to, rename remotely, or remove) and a row that looks the same invites the reading
that your own machine is sitting in your list of other machines.

The difference SHALL be structural rather than a caption alone — its container, its glyph,
or its fill SHALL differ from a device row — and the text beside the name SHALL say what
the name is for rather than only labelling the section.

Its picture SHALL be derived from the name, so the same name always draws the same picture
and renaming the device redraws it. The picture SHALL be generated on the device: it SHALL NOT
be fetched from a third-party service, because the name would ride in that request and the app
is device to device with no cloud. It SHALL therefore render with no connection.

#### Scenario: The self-name panel is distinguishable at a glance

- **WHEN** the Devices page renders with at least one paired device
- **THEN** this device's panel differs from the paired rows in shape, glyph, or fill, and it
  is not an identically styled row above them

#### Scenario: The label says what the name does

- **WHEN** this device's panel renders
- **THEN** the text beside the name says that other devices see it, rather than only naming the section

#### Scenario: The picture follows the name

- **WHEN** the user renames this device
- **THEN** its picture changes with the name, and the same name always draws the same picture

#### Scenario: The picture needs no network

- **WHEN** the panel renders with no connection
- **THEN** the picture is drawn anyway, and no request for it leaves the device

#### Scenario: Opening the rename does not move the panel

- **WHEN** the user opens and closes the rename on this device's panel
- **THEN** the panel is the same height throughout and nothing below it moves

### Requirement: A shown code says how long it lasts and when it is spent

A pairing code shown to the user SHALL carry its remaining life on screen, counted
down from the lifetime the core reports for that code. The UI SHALL NOT hard-code
the pairing timeout: the number it counts down from SHALL come from the same value
the core enforces.

When the countdown reaches zero the code SHALL be marked spent: it SHALL stop being
presented as usable, the QR SHALL no longer be readable as a live code, and one
control SHALL offer a new code. A code the other device has already used SHALL be
marked spent the same way, at the moment this device learns it was used.

Copying the code SHALL be the only action offered while a code is live. Replacing a code
that still works SHALL NOT have a control of its own: the card replaces the code when it
runs out, which is the one moment the offer is useful, and a second control there costs
space for something nobody needs.

The code's remaining time SHALL be shown on the code's own surface rather than as a
sentence beside it, and SHALL stay readable while the code itself is still covered: how
long a code has left is not part of the secret.

A spent code SHALL be covered again, so a dead code is never left on display.

The copy SHALL say what happened and the one thing to do, in the app's ordinary
voice, and SHALL NOT use "expired", "timeout", "session", or an em dash.

#### Scenario: A live code shows its remaining time

- **WHEN** a pairing code is on screen
- **THEN** its remaining time is shown on the code's own surface, decreasing as time passes, and it
  is readable even while the code is still covered

#### Scenario: Copy is the only action on a live code

- **WHEN** a live code is on screen
- **THEN** copying it is the action offered, and no control asks for a replacement

#### Scenario: A replacement is offered once the code is spent

- **WHEN** a shown code runs out or is used
- **THEN** the same row offers a new code

#### Scenario: A run-out code stops looking usable

- **WHEN** a shown code's time runs out
- **THEN** the code and its QR are no longer presented as usable and a control offers a new one

#### Scenario: A used code is marked spent

- **WHEN** another device redeems the code this device is showing
- **THEN** this device stops presenting that code as usable

#### Scenario: A new code restarts the countdown

- **WHEN** the user asks for a new code after one ran out
- **THEN** a fresh code is shown with a full countdown and the spent state is gone

### Requirement: Managing devices works with no connection

When pairing is unavailable — the core's pairing service did not come up, or there is
no connection — the Devices page SHALL still show this device's name and the list of
paired devices, and renaming this device, renaming a paired device, and removing a
paired device SHALL all still work. These are local operations against the trust store
and do not need the broker.

Only the add-a-device entry SHALL be blocked in that state, and the reason SHALL be
said once, next to the blocked entry, in one line. The page SHALL NOT replace its whole
contents with an error state.

#### Scenario: The list survives an unavailable pairing service

- **WHEN** the Devices page renders while pairing is unavailable and devices are paired
- **THEN** this device's name and every paired device row are shown

#### Scenario: Local actions still work offline

- **WHEN** the user renames or removes a device while pairing is unavailable
- **THEN** the change is saved and the list reflects it

#### Scenario: Only adding is blocked

- **WHEN** pairing is unavailable
- **THEN** the add-a-device entry cannot be opened and one line beside it says why
