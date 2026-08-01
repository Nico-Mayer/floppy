## MODIFIED Requirements

### Requirement: Dedicated Devices page

The app SHALL provide a dedicated Devices page reachable from top-level navigation
(not nested inside Settings). The page SHALL show this device's editable self-name
at the top, the list of paired devices below it, and a way to add a device.
Removing a device from the list SHALL revoke local trust so that device can no
longer send without a code.

The page's body SHALL be this device and its paired devices, and nothing else. This device's
own code SHALL NOT occupy space on the page: it matters only while another device is being
added, which is not what most visits are for. Its way in SHALL be a control on the page's
heading row, at that row's trailing edge, so it is one press away without being in the way.

Removal SHALL require a confirmation before trust is revoked, however the remove action was
reached, because revoking trust cannot be undone without pairing again. How the action is
reached on each pointer type belongs to `interaction`.

#### Scenario: Devices page is its own destination

- **WHEN** the user opens the app navigation
- **THEN** Devices is a top-level entry, separate from Settings

#### Scenario: Self-name is editable from the page

- **WHEN** the user edits this device's self-name on the Devices page
- **THEN** the new name is saved and used for future pairings and transfers

#### Scenario: The page is name and devices

- **WHEN** the Devices page renders
- **THEN** this device's name is first and the paired devices follow, with no QR or code text
  taking space between them

#### Scenario: The code is reachable from the heading

- **WHEN** the user presses the code control at the trailing edge of the page's heading row
- **THEN** this device's code opens in a panel over the page

#### Scenario: The panel holds no card

- **WHEN** the code panel renders
- **THEN** the QR and code sit directly in it, with no card border of their own

#### Scenario: Remove revokes trust

- **WHEN** the user removes a paired device from the list
- **THEN** that device is no longer trusted and a code-free send from it is refused

#### Scenario: Removal still confirms before revoking

- **WHEN** the user activates the remove action, however it was reached
- **THEN** a confirmation appears, and trust is revoked only once it is confirmed

### Requirement: Symmetric add-a-device flow

Adding a device SHALL be symmetric: the Devices page SHALL offer both directions — showing this
device's own pairing QR and short code, and consuming the other device's code — and the user
SHALL NOT have to choose an "initiator" or "opener" role. Both SHALL be reachable from the page
without opening anything first. The short code SHALL use the same
`<4 digits>-<word>-<word>-<word>` format as transfer codes.

This device's code SHALL live in a panel opened from the page's heading, as a drawer on a coarse
pointer and a centred dialog on a fine one. The panel SHALL ask for one code as it opens, SHALL
NOT ask again on its own, and SHALL drop the code as it closes, so a visit that never opens it
costs no pairing session at the broker. A failed request SHALL NOT be retried in a loop.

The panel SHALL NOT cover its own contents. A cover exists to keep a code off a screen nobody
asked to show it on; opening the panel is that ask, so the code SHALL be legible as soon as the
panel is.

The panel SHALL hold one height across every state it has — waiting for a code, showing one, and
after one is spent — and the controls beside the code SHALL be present in all three. A code
arriving, being replaced, or being used up SHALL move nothing else in the panel.

The shown code and its QR SHALL read as one object, with no gap opened between them, and the
code's line SHALL have room reserved for the longest code the app can generate. Wrapping into
space that was already there is acceptable; growing the panel, or clipping the code, is not.

The code SHALL NOT be wrapped in a card inside the panel. The panel is already a surface with
its own edge, and a second edge around the same content states nothing the first one did not.

Consuming the other device's code SHALL be reached from a control beside the paired devices.
On a platform with a camera that control SHALL open the camera; where there is no camera it
SHALL open the code field. Entering the code by hand SHALL remain available and sufficient on
every platform.

When a pairing completes while either surface is open, that surface SHALL close itself, because
the device the user was adding is now a row in the list behind it.

#### Scenario: Both directions are on the page

- **WHEN** the user opens the Devices page
- **THEN** a control opens this device's code, and another opens the way to use the other device's code

#### Scenario: The panel asks for one code, once

- **WHEN** the code panel opens
- **THEN** exactly one code is requested, and it is legible without a further press

#### Scenario: A closed panel holds no code

- **WHEN** the user opens the Devices page and never opens the code panel
- **THEN** no pairing code is requested

#### Scenario: A failed request is not retried in a loop

- **WHEN** asking for a code fails
- **THEN** the failure is reported once and no further request is made on its own

#### Scenario: The panel does not move as its state changes

- **WHEN** a code arrives, is replaced, and runs out
- **THEN** the panel is the same height throughout, the controls beside the code stay in place, and
  nothing else in it moves

#### Scenario: The longest possible code does not break the panel

- **WHEN** the shown code is the longest this app can generate, on the narrowest supported width
- **THEN** the code stays legible at no less than 16px on a coarse pointer, the panel does not grow
  or overflow, and nothing in it moves

#### Scenario: Scanning consumes the other device's code

- **WHEN** the user scans the QR shown on another device
- **THEN** pairing begins toward that device without any role selection

#### Scenario: Typed code is a full fallback

- **WHEN** no camera is available and the user types the other device's code
- **THEN** pairing proceeds the same as it would from a scan

#### Scenario: The surface closes on success

- **WHEN** a pairing completes while the code panel or the code field is open
- **THEN** that surface closes and the new device is visible in the list

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
that still works SHALL NOT have a control of its own: the panel replaces the code when it
runs out, which is the one moment the offer is useful, and a second control there costs
space for something nobody needs.

The code's remaining time SHALL be shown on the code's own surface rather than as a
sentence beside it.

The copy SHALL say what happened and the one thing to do, in the app's ordinary
voice, and SHALL NOT use "expired", "timeout", "session", or an em dash.

#### Scenario: A live code shows its remaining time

- **WHEN** a pairing code is on screen
- **THEN** its remaining time is shown on the code's own surface, decreasing as time passes

#### Scenario: Copy is the only action on a live code

- **WHEN** a live code is on screen
- **THEN** copying it is the action offered, and no control asks for a replacement

#### Scenario: A replacement is offered once the code is spent

- **WHEN** a shown code runs out or is used
- **THEN** the same row offers a new code

#### Scenario: A run-out code stops looking usable

- **WHEN** a shown code's time runs out
- **THEN** the code and its QR are replaced rather than left on display, and a control offers a new one

#### Scenario: A used code is marked spent

- **WHEN** another device redeems the code this device is showing
- **THEN** this device stops presenting that code as usable

#### Scenario: A new code restarts the countdown

- **WHEN** the user asks for a new code after one ran out
- **THEN** a fresh code is shown with a full countdown and the spent state is gone

## ADDED Requirements

### Requirement: Scanning is how a phone adds a device

On a phone or tablet build, the control that adds a device SHALL open the camera, because holding
the camera up to the other screen is how a person adds a device with a phone in their hand. It
SHALL NOT put a step between the press and the camera. On desktop, where there is no scanner, the
same control SHALL open the code field, and no camera SHALL be requested.

The camera SHALL run under the app's own chrome rather than in a surface the app cannot draw on.

Arriving and leaving SHALL be one motion each. The app SHALL NOT blink out before the camera's chrome
arrives, and SHALL NOT return before that chrome has finished leaving: two unrelated motions in
sequence is what makes a camera surface feel bolted on. Nor SHALL the aiming window show a black
square while the camera starts — a camera that has been asked for but is not yet showing anything
SHALL be covered rather than exposed.
While it runs, the app SHALL show, at minimum, a bounded window to aim through, what the user is
meant to point at, a way back to the app, and a way to type the code instead.

The window SHALL be the only undimmed part of the screen, so the person knows where to hold the
other device without being told. Everything outside it SHALL be dimmed by the app, not by the
platform.

The controls SHALL sit above that dimming. A control rendered under the screen's own dimming reads
as disabled, which is worse than no dimming at all. A scanner the user can only leave through an OS
control is not acceptable: the two things a person does when a scan is not working are give up and
type it, and both SHALL be one press away.

The camera permission SHALL be settled before that chrome appears, so a refusal never flashes a
viewfinder that was never going to work.

A scanned code SHALL be handed to the same redemption the typed code uses, recorded as having
arrived by scan, so the device that showed it can decide about the SAS compare as it already does.
The app SHALL NOT require the scanned content to be anything but the code: no link, no wrapper.

Reading a code SHALL be acknowledged before anything slower happens: the camera surface SHALL say
that something was read, and on a device with a vibrator that SHALL be felt too. Redeeming it takes
a round trip and the other device's yes, so a camera that closed the moment it decoded left the
person with no sign it had worked at all.

The camera surface SHALL then stay up long enough to say how it ended:

- while the pairing is being agreed, it SHALL say it is asking the other device,
- once agreed, it SHALL say the device was added before it closes,
- if the code is refused, it SHALL say why and SHALL return to the camera, because the fix is to
  aim at another code and the camera is already in the person's hand.

A refused code SHALL NOT close the camera and report itself somewhere else.

The camera surface SHALL be escapable in every state that can last: aiming, waiting on the other
device, and after a refusal. The wait is the one that matters most, because it waits on a person
looking at another phone who may not be in the room. Only the moment after a pairing has succeeded
MAY have no exit, being both brief and finished.

The wait SHALL also end on its own. It SHALL say when it is taking longer than expected, and it
SHALL give up before the core's own pairing bound rather than sitting on it: two minutes is a
reasonable bound for a pairing and an unreasonable one for a person holding a camera up. Giving up
SHALL leave the person at the code field.

Giving up on the wait SHALL NOT be required to cancel the redemption underneath it. A pairing the
other device agrees to afterwards SHALL still complete, and the device list SHALL still gain the
row.

Every way the camera can end without a pairing SHALL leave the user somewhere they can act:

- asking to type the code instead SHALL open the code field,
- a refused camera SHALL open the code field, say the camera is off, and offer the way to the
  platform's settings,
- a scanner failure SHALL open the code field and report what happened,
- going back to the app SHALL open nothing at all, because that is what was asked for.

The code field SHALL offer the way back to the camera, so neither direction is a one-way door.

Stopping the camera SHALL settle the attempt once, however it ended. The plugin failing a running
scan because the app cancelled it SHALL NOT be reported as a second, different outcome.

#### Scenario: A phone goes straight to the camera

- **WHEN** the user presses the add-a-device control on a phone build
- **THEN** the camera opens with no intervening step

#### Scenario: A scan pairs like a typed code

- **WHEN** the camera decodes the code another device is showing
- **THEN** pairing proceeds, recorded as having arrived by scan

#### Scenario: Reading a code is acknowledged at once

- **WHEN** the camera decodes a code
- **THEN** the surface says so immediately, before the pairing has been agreed, and a phone with a
  vibrator gives feedback

#### Scenario: The wait is shown, and so is the end of it

- **WHEN** a decoded code is being redeemed
- **THEN** the surface says it is asking the other device, and once the pairing is agreed it says the
  device was added before closing

#### Scenario: The wait can be abandoned

- **WHEN** a decoded code is waiting on the other device
- **THEN** a control is present that returns the user to the app

#### Scenario: A long wait says so, and offers the field

- **WHEN** the wait runs longer than expected
- **THEN** the surface says it is still waiting and offers typing the code instead

#### Scenario: The wait gives up on its own

- **WHEN** the other device never answers
- **THEN** the camera surface ends before the core's pairing bound and the code field opens

#### Scenario: A late yes still pairs

- **WHEN** the user gives up on the wait and the other device says yes afterwards
- **THEN** the pairing completes and the device appears in the list

#### Scenario: A refused code returns to the camera

- **WHEN** a decoded code is refused, for example because it has already been used
- **THEN** the surface says why and the camera comes back, without closing or moving the message
  somewhere else

#### Scenario: Opening and closing are single motions

- **WHEN** the camera surface opens and later closes
- **THEN** the app fades out as the chrome arrives and returns only once the chrome has left, with no
  blink in either direction

#### Scenario: A starting camera is not a black square

- **WHEN** the camera has been asked for but is not showing anything yet
- **THEN** the aiming window is a surface rather than a hole, and becomes a hole once the camera is up

#### Scenario: The camera runs under the app's own controls

- **WHEN** the camera is running on a phone build
- **THEN** the app shows a bounded window to aim through, what to point at, a way back, and a way to
  type the code instead

#### Scenario: Only the window is bright

- **WHEN** the camera is running
- **THEN** the area outside the aiming window is dimmed, including to the edges of the screen

#### Scenario: The controls are not dimmed with the background

- **WHEN** the camera is running
- **THEN** the way back and the way to type sit above the dimming at full strength

#### Scenario: Asking to type lands on the field

- **WHEN** the user chooses to type the code instead while the camera is running
- **THEN** the camera stops and the code field opens

#### Scenario: Going back opens nothing

- **WHEN** the user goes back to the app from the camera
- **THEN** the camera stops and no other surface opens

#### Scenario: One ending per attempt

- **WHEN** the user stops the camera and the plugin then fails the scan it was running
- **THEN** the attempt is reported once, as the stop the user asked for

#### Scenario: A refused camera lands on the field, and says so

- **WHEN** the camera permission is denied
- **THEN** the code field opens, one line says the camera is off, and the platform's settings are
  offered

#### Scenario: Desktop asks for no camera

- **WHEN** the user presses the add-a-device control on a desktop build
- **THEN** the code field opens and no camera permission is requested

#### Scenario: The field offers the camera back

- **WHEN** the code field is open on a phone build
- **THEN** it offers a way back to the camera

## REMOVED Requirements

### Requirement: Scanning has a slot in the add flow before it is wired up

**Reason**: The slot has been filled. Scanning is a real camera on the mobile targets now, so the
requirements about not imitating one, and about keeping the step shaped for a scanner that does not
exist yet, no longer describe anything. What replaces them is "Scanning is how a phone adds a
device", which covers the camera, its permission, and the paths off it.

**Migration**: None. The placeholder step is deleted; the control that opened it opens the camera.
Typing a code remains a complete path, as that requirement also demanded.
