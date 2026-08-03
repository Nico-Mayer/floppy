## ADDED Requirements

### Requirement: The pairing code's QR carries a link to that code

The QR the code panel shows SHALL encode a `floppy://` pairing link carrying the code, not
the bare code, for the same reason the send QR does: a reader outside the app has something
it can act on, and a reader inside the app can tell a pairing code from a share code.

The code SHALL still be shown as the bare phrase beside the QR, and any control that copies
it SHALL copy the bare code. The link exists inside the QR's pixels only.

#### Scenario: The pairing QR encodes a pairing link

- **WHEN** the code panel shows a live pairing code
- **THEN** the QR encodes a `floppy://` pairing link carrying that code

#### Scenario: The shown code stays bare

- **WHEN** the user reads or copies the pairing code
- **THEN** what is shown and what is copied is the bare code, never a URL

### Requirement: An arriving pairing link fills the code field and waits

A `floppy://` pairing link opened on this device SHALL open the Devices page with the code
field open and the code filled in, and SHALL NOT redeem it. Pressing the field's own control
SHALL redeem it, recorded as a typed code, so the device that showed it does its SAS compare.

A link is not proof that two devices are in the same room: it can be forwarded, pasted into a
chat, or opened from a page. The SAS compare is exactly what a scan is allowed to skip in
exchange for that proof, so a link SHALL never be recorded as a scan.

#### Scenario: A pairing link prefills rather than pairs

- **WHEN** a `floppy://` pairing link is opened on this device
- **THEN** the Devices page opens with the code field filled in, and nothing is redeemed until
  the user presses

#### Scenario: A link pairs like a typed code

- **WHEN** the user presses the control on a code field filled in from a link
- **THEN** the redemption is recorded as a typed code and the other device is asked for the SAS
  compare

## MODIFIED Requirements

### Requirement: No pasted links in the pairing UI

The pairing UI SHALL NOT ask the user to paste a link, and SHALL NOT present the
pairing secret as a URL to copy. Adding a device SHALL be done by scanning a QR or
entering a code. User-visible copy SHALL use "code", "your devices", "paired", and
"Remove", and SHALL NOT use "pair link", "key", or "trusted".

A QR MAY encode a `floppy://` link carrying the code: a QR is a thing a camera reads, not a
field a person pastes into, and what the UI shows beside it is still the bare code. A
pairing link the user opens SHALL fill the code field and SHALL NOT redeem anything on
arrival, so opening a link is never by itself a way to pair.

#### Scenario: No paste-a-link affordance

- **WHEN** the user is adding a device
- **THEN** the UI offers scan or code entry and never a paste-a-link field

#### Scenario: Consistent vocabulary

- **WHEN** any pairing-related string is shown
- **THEN** it uses the device/code/paired vocabulary and avoids link/key/trusted wording

#### Scenario: A link is never a redemption on its own

- **WHEN** a pairing link is opened on this device
- **THEN** the code field is filled in and the pairing waits for the user to press

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
The app SHALL accept either shape a code can arrive in: the `floppy://` pairing link the app
renders in its QR, or the bare code. It SHALL NOT require a link — a code read from a sticky note
or from an older build still works — and it SHALL NOT require any other wrapper. Content that is
neither SHALL be refused as not being a Floppy code, and a share code read here SHALL be refused
with one line naming the screen it belongs to, both of them with the camera still live.

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

Nothing in this surface SHALL be specific to pairing. The camera, its window, its beats and its
endings SHALL be one surface the app can point at more than one kind of code, with what it says and
what a decoded code means supplied by the flow that opened it.

#### Scenario: A phone goes straight to the camera

- **WHEN** the user presses the add-a-device control on a phone build
- **THEN** the camera opens with no intervening step

#### Scenario: A scan pairs like a typed code

- **WHEN** the camera decodes the code another device is showing
- **THEN** pairing proceeds, recorded as having arrived by scan

#### Scenario: A pairing link in a QR pairs the same way

- **WHEN** the camera decodes a QR carrying a `floppy://` pairing link
- **THEN** the code inside it is redeemed exactly as a bare code would be, recorded as having
  arrived by scan

#### Scenario: A bare code is still enough

- **WHEN** the camera decodes a bare `1234-word-word-word` code while adding a device
- **THEN** pairing proceeds and no link or wrapper is required

#### Scenario: A share code read here says where it belongs

- **WHEN** the camera on the add-a-device flow reads a QR carrying a share code
- **THEN** one line says it is a code for sending files and names the Receive screen, and the
  camera stays live

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

#### Scenario: The camera surface serves more than one flow

- **WHEN** the camera is opened from the Receive panel rather than from adding a device
- **THEN** the same surface runs, saying what that flow gave it to say, and a decoded code means
  what that flow says it means
