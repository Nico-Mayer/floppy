# device-management

## Purpose

The Devices screen and the add-a-device flow: this device's editable self-name, the list of
paired devices with local renames and trust revocation, and one symmetric screen that shows
this device's code and consumes another's without the user picking a role.
## Requirements
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
the peer by its advertised self-name (e.g. "Add NicoPC?"). When the
request arrived via a scanned QR the confirmation SHALL NOT require an SAS
comparison; when it arrived via a typed code the confirmation SHALL show the SAS
for the user to compare.

The confirmation SHALL be a question and its two answers, and SHALL NOT carry a text
field. It SHALL NOT ask for a name and SHALL NOT offer to change one: the device is
added under the name it advertised for itself, and renaming it happens on the device
list afterwards, where it can be seen next to the others. A prompt that arrives
unasked cannot be allowed to hold a field, because on a phone a field on screen is a
soft keyboard waiting to happen.

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
- **THEN** it shows a single confirmation naming the peer, with nothing to type into

#### Scenario: The confirmation raises no keyboard

- **WHEN** the confirmation opens on a phone
- **THEN** the soft keyboard stays down and the panel does not resize under one

#### Scenario: The added device carries the name it advertised

- **WHEN** the user accepts the confirmation
- **THEN** the device appears in the list under the self-name it advertised, and can
  be renamed from its row

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

### Requirement: Device actions show they are working

Every asynchronous device action — accepting or declining an incoming pairing, confirming a
pairing, sending to a device, renaming, and removing — SHALL show in-flight state on the
control that started it, through the shared pending primitives, until the action settles.
The action SHALL NOT be startable a second time while it runs.

The pending state SHALL be held in the shared device state rather than in one component, so
a row, a dialog, and a panel that can each start the same action all reflect it, and the
state survives any one of them closing.

#### Scenario: Confirming a pairing shows it is working

- **WHEN** the user confirms an incoming pairing and the agreement takes noticeable time
- **THEN** the confirm control shows a pending indication and cannot be pressed again until
  the pairing settles

#### Scenario: A slow removal is visibly in flight

- **WHEN** the user confirms removing a device
- **THEN** the confirming control shows pending state until trust is revoked and the row
  leaves the list

#### Scenario: Two surfaces agree about one pending action

- **WHEN** an action started from one surface is still running and another surface that can
  start the same action is open
- **THEN** the other surface also shows that action as pending

### Requirement: A completed pairing is seen arriving

When a pairing completes, the new device's row SHALL arrive visibly: it SHALL enter the
paired list with the shared arrival treatment (motion plus a brief highlight that decays on
its own) rather than appearing between two frames. The existing behaviors around it are
unchanged: the pairing surface still closes itself, and the accepted haptic still fires.

No completion dialog and no success toast SHALL be added: the row is the result, and the
arrival treatment is what points the user at it.

#### Scenario: The new row announces itself

- **WHEN** a pairing completes while the Devices page is visible
- **THEN** the new row enters with the arrival treatment and its highlight fades on its own

#### Scenario: Arriving elsewhere still lands visibly

- **WHEN** a pairing completes while the user is on another screen
- **THEN** the next visit to the Devices page shows the device in the list, and no dialog or
  toast interrupted the screen the user was on

#### Scenario: Reduced motion still shows the arrival

- **WHEN** the user prefers reduced motion and a pairing completes on the Devices page
- **THEN** the row appears with the motion collapsed to a fade, and the brief highlight still
  identifies it

