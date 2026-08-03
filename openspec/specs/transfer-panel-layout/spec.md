# transfer-panel-layout

## Purpose

Define the responsive layout contract for the Send and Receive transfer panels: container-width-driven compact/regular layouts, touch-target minimums on coarse-pointer devices, mascot retention, and a stable two-zone (status/action) structure across all panel states.
## Requirements
### Requirement: Panels adapt to their container width

The Send and Receive panels SHALL switch between a compact and a regular layout based on the width of their containing card (CSS container queries), not the viewport. The compact layout SHALL be fully usable — no clipped content, no horizontal scrolling — at the minimum window width of 500px.

#### Scenario: Narrow card uses compact layout

- **WHEN** the window is resized to its minimum width (500px)
- **THEN** panels render the compact layout: stacked content, smaller mascot, full-width primary actions, no horizontal overflow

#### Scenario: Wide card uses regular layout

- **WHEN** the card is wide enough for the regular breakpoint
- **THEN** idle states render the mascot beside the copy and controls at content width

#### Scenario: Send waiting state leads with QR when compact

- **WHEN** the send panel shows the code/QR waiting state in a compact-width card
- **THEN** the QR code renders large and stacked above the code phrase; in regular width it recedes beside the phrase

### Requirement: Mascot is retained in idle states

Both panels SHALL show the mascot in their idle states in both layouts: reduced and stacked in compact, beside the descriptive copy in regular. The mascot SHALL NOT be removed to solve space constraints.

#### Scenario: Compact idle keeps mascot

- **WHEN** the receive panel is idle in a compact-width card
- **THEN** the mascot is visible (smaller, stacked above the copy)

#### Scenario: Regular idle shows hero row

- **WHEN** the receive panel is idle in a regular-width card
- **THEN** the mascot renders beside the title/description as a horizontal group

### Requirement: All states share a stable two-zone structure

Every panel state (idle, connecting/waiting, transferring, done, cancelling) SHALL render into the same structure: a flexible status zone above and an anchored action zone at the bottom of the card. Primary and destructive actions SHALL appear in the action zone at a consistent position across states.

#### Scenario: Action row does not jump between states

- **WHEN** the receive panel transitions idle → connecting → receiving → done
- **THEN** the action controls (Receive files / Cancel / Open folder) render at the same anchored bottom position in every state

#### Scenario: Tall content scrolls inside the status zone

- **WHEN** the send file list grows beyond the available card height
- **THEN** the list scrolls within the status zone and the action zone stays visible and anchored

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

### Requirement: The transfer surface is headerless and dissolves its chrome on mobile

The transfer card SHALL render no header of its own at any width: no title row, no tint dot,
no status headline, and no badge. The screen's title, accent dot, and live status line SHALL
come from the shared top bar (see `app-shell`), and the large-transfer warning SHALL render
as that heading's trailing action. The status badge is removed without replacement: the
percent is carried by the progress display, the queue size by the file list, and the phase
by the status line.

Below the `sm` breakpoint the Send and Receive screens SHALL each present as one full-bleed
surface rather than a floating card inside padding: the card SHALL drop its border, shadow,
radius, background, and horizontal padding so it becomes the page, and the page SHALL supply
exactly one gutter and drop its max-width so content spans the available width. At `sm` and
above the card SHALL keep its box chrome (border, shadow, radius, background). Feature
parity SHALL be preserved at every width: every state, the action zone, and the file-drop
target remain.

The two chrome treatments SHALL be named variants of the card, selected by name, rather than
override classes applied at the call site, so neither treatment can partially drift. The page
gutter itself belongs to the shared page container (see `app-shell`), not to this screen.

#### Scenario: Mobile card is full-bleed

- **WHEN** either transfer screen renders below the `sm` breakpoint
- **THEN** the transfer surface spans the content width with no card border, shadow,
  radius, or horizontal card padding, with a single page gutter and no centered narrow column

#### Scenario: The card renders no header at any width

- **WHEN** either transfer screen renders at any width in any state
- **THEN** the card shows no title, dot, headline, or badge of its own, and the shared top
  bar above it carries the title and the live status

#### Scenario: No badge renders on the transfer screens

- **WHEN** either transfer screen renders in any state
- **THEN** no status badge is shown anywhere on the screen

#### Scenario: Desktop card keeps its box

- **WHEN** either transfer screen renders at `sm` width or above
- **THEN** the card retains its border, shadow, radius, and background, with the content and
  action zones unchanged

#### Scenario: Chrome is selected by name

- **WHEN** the transfer card renders in either treatment
- **THEN** the treatment is chosen through a named variant of the card, and no call site
  applies chrome-removal classes of its own

#### Scenario: Full-bleed width triggers the roomy panel layouts

- **WHEN** the mobile card is full-bleed and its content width crosses the panels'
  container-query breakpoints
- **THEN** the Send and Receive panels render their regular (roomy) layouts, as already
  defined by the container-query requirement, without any mobile-specific panel code

#### Scenario: Feature parity holds on mobile

- **WHEN** either transfer screen is used on a phone
- **THEN** every transfer state, the anchored action zone, and the file-drop target behave
  exactly as on desktop

### Requirement: Send and Receive are separate destinations

Send and Receive SHALL be two top-level destinations, each with its own route, rather than two
modes of one screen. There SHALL be no in-screen control for switching between them: switching is
navigation, performed through the bottom bar, the desktop sidebar, or a keyboard shortcut.

There SHALL NOT be an application state field that selects which of the two is showing. The
current route is the only representation of that choice, so the two cannot disagree.

Both screens SHALL keep their state across navigation away and back, because the transfer state
and its event streams belong to the shell rather than to either route.

#### Scenario: Each is its own destination

- **WHEN** the user opens the app
- **THEN** Send and Receive appear as separate destinations in the navigation, each reachable
  directly

#### Scenario: No in-screen switcher exists

- **WHEN** either screen renders at any width
- **THEN** it contains no segmented control, tab strip, or other control for switching to the
  other one

#### Scenario: Switching is navigation

- **WHEN** the user switches from Send to Receive by any means
- **THEN** the app navigates to the Receive destination, and the navigation surface reflects it

#### Scenario: State survives leaving and returning

- **WHEN** a transfer is in progress, the user navigates away, and later returns to that screen
- **THEN** the screen shows the transfer's current state, having lost nothing

#### Scenario: The app opens on Send

- **WHEN** the app is launched with no destination specified
- **THEN** it lands on the Send destination

### Requirement: Each transfer screen owns its own errors

A transfer failure SHALL be presented on the screen of the side that failed, and SHALL NOT be
presented on the other. A send failure and a receive failure SHALL be able to exist at once
without either replacing the other.

Because a failure can arrive while the user is on another destination, the failed side SHALL be
indicated in the navigation, so the failure is discoverable without knowing which screen to
check.

#### Scenario: A failure appears on its own screen

- **WHEN** a send fails
- **THEN** the failure is described on the Send screen, and the Receive screen shows no error

#### Scenario: Two failures coexist

- **WHEN** a send has failed and a receive then fails
- **THEN** each screen shows its own failure and neither clears the other

#### Scenario: A failure elsewhere is announced in navigation

- **WHEN** a transfer fails while the user is on a different destination
- **THEN** the failed side's navigation item indicates it, and opening that destination shows
  the failure in full

#### Scenario: Dismissing one leaves the other

- **WHEN** the user dismisses the failure on one screen
- **THEN** the other screen's failure is untouched

### Requirement: The Send idle action zone is a single row

While the Send panel is idle with files queued, its anchored action zone SHALL occupy
one row: the send target on the left, taking the leftover width, and the Send button
on the right at its content width. There SHALL NOT be a separate visible field label
for the target, and the target SHALL NOT occupy a row of its own above the button. The
target's accessible name SHALL be preserved even though the visible label is gone.

That row SHALL be one pill: a single rounded, raised surface holding both controls, at
every width and on every platform. The pill SHALL be the only chrome in the zone. The
controls inside it SHALL NOT carry a border, a background, or rounding of their own, so
the zone reads as one bar rather than as two boxes sitting side by side.

The Send control SHALL be an icon button with no visible text. Its icon SHALL name the
kind of send the current target implies: a send glyph when a trusted device is chosen, a
QR glyph when the code target is chosen. Its accessible name SHALL say what pressing it
does and SHALL change with the target, so a screen reader is never told only "Send" when
the act is to put a code on screen. Pressing it SHALL dispatch exactly the send the
current target selects, unchanged from before.

The zone SHALL hold one pill in every idle shape, including the one where no device is
trusted yet: the pair-entry link that stands in for the picker there SHALL sit inside the
pill as its content rather than beside it or in place of it.

This describes the idle zone when nothing is pending. While a picker call is in flight the
zone instead reports the wait and carries no send target and no Send button, so a send cannot
be started over a selection that has not finished arriving — see "The Send panel reports a
picker call that is still in flight". The report SHALL match the pill's height and shape, so
the swap in either direction moves nothing. The pill returns unchanged when the pick resolves.

The target control SHALL truncate a long label rather than growing the row or pushing
the Send button out of the pill.

The row SHALL NOT change the anchored position of the action zone: Send sits where
Cancel and "Send more files" sit in the other states.

#### Scenario: Target and Send share one line

- **WHEN** the Send panel is idle with at least one file queued and no pick in flight
- **THEN** the target control and the Send button render side by side inside one rounded
  raised bar, with no visible "Send to" label above them, no third control between them,
  and no border or background of their own around either control

#### Scenario: Send is icon-only and names the send it will start

- **WHEN** the chosen target is a trusted device
- **THEN** the Send control shows a send glyph, no text, and its accessible name says the
  files go to that device

#### Scenario: The code target arms a QR-marked Send

- **WHEN** the chosen target is the code target
- **THEN** the Send control shows a QR glyph, no text, and its accessible name says it puts
  a code on screen

#### Scenario: The glyph follows a change of target

- **WHEN** the user switches the target between a device and the code target
- **THEN** the Send control's glyph and accessible name change with it, in place, without the
  pill resizing or the zone moving

#### Scenario: Nothing paired still renders one pill

- **WHEN** the Send panel is idle with files queued and no device is trusted
- **THEN** the pair-entry link renders inside the pill in the target's place, the Send
  control stays at the trailing edge with its QR glyph, and the zone is still one bar

#### Scenario: A long device name does not break the row

- **WHEN** the chosen target is a device with a name longer than the available width
- **THEN** the name truncates inside the target control and the Send button stays
  fully visible at its usual size

#### Scenario: The action zone stays anchored across states

- **WHEN** the Send panel goes idle → starting → sending → done
- **THEN** the primary control in each state renders at the same anchored bottom
  position, unmoved by the idle row's new shape

#### Scenario: The pill and the pending report are the same size

- **WHEN** a pick starts over a queue that already holds files, and again when it resolves
- **THEN** the report and the pill occupy the same slot at the same height and the same
  rounded shape, and nothing above or below the zone moves during the swap

#### Scenario: The compact card still fits the row

- **WHEN** the Send panel is idle with files queued in a card at the 500px minimum
  window width, or full-bleed on a phone
- **THEN** the pill renders on one line with no horizontal overflow and no clipped
  control

#### Scenario: The Send control is reachable with a finger

- **WHEN** the Send panel is idle with files queued on a coarse-pointer device
- **THEN** the icon-only Send control meets the touch hit-area minimum the `interaction`
  capability sets, without the pill growing past the row height it has on a fine pointer
  by more than that minimum requires

### Requirement: The send target picker uses the platform's native picker on coarse pointers

On a coarse pointer the send target SHALL be chosen through the platform's native
select control, so the option list is drawn and dismissed by the operating system. On
a fine pointer it SHALL remain the styled listbox. Both SHALL offer the same options
in the same order — the code target first, then the trusted devices — SHALL group them
under the same headings, and SHALL write to the same bound value, so the choice made
in either control is indistinguishable to the rest of the send flow.

Inside the Send idle pill both controls SHALL be presented without chrome of their own —
no border, no filled background, no separate rounding — while keeping their own focus
indication, their disclosure affordance, and their full activation area. Removing the
chrome SHALL NOT change which control renders, what it lists, or what it writes.

Switching between the two controls SHALL NOT lose or change the current selection.

#### Scenario: Coarse pointer gets the native control

- **WHEN** the user opens the send target picker on a coarse-pointer device
- **THEN** the choice is presented by the platform's own picker, listing the code
  target and every trusted device under their group headings

#### Scenario: Fine pointer keeps the styled listbox

- **WHEN** the user opens the send target picker with a mouse
- **THEN** the styled listbox opens, with its icons, group headings, and separator
  unchanged

#### Scenario: Either control is chrome-less inside the pill

- **WHEN** the send target control renders in the Send idle pill, in either form
- **THEN** it shows no border, no filled background, and no rounding of its own, and it
  still shows its disclosure affordance and takes focus with a visible focus indication

#### Scenario: The selection survives a pointer change

- **WHEN** a target is chosen and the pointer type then changes, swapping which
  control renders
- **THEN** the same target is still selected and sending is unaffected

#### Scenario: The chosen device disappearing still falls back to the code target

- **WHEN** the selected device is removed from the trusted list while the picker shows
  it, in either control
- **THEN** the picker shows the code target and a send dispatches as a code send, and the
  Send control's glyph changes to the QR glyph with it

### Requirement: The chosen send target is shared state and survives leaving the panel

The send target the user has chosen SHALL live in the shared send state, not in the Send panel's
own component state, so it survives leaving the Send screen and coming back. Someone who picked a
device, went to look at something else, and came back SHALL find the same target selected rather
than silently falling back to the code send.

Choosing a target SHALL never start a transfer. It picks who, and Send still owns what and when.

A target naming a device that is no longer trusted SHALL fall back to the code target, so a device
removed after being chosen can never be the thing Send points at.

#### Scenario: The selection survives navigation

- **WHEN** the user chooses a device in the Send target picker, leaves the Send screen, and returns
- **THEN** that device is still the selected target

#### Scenario: Choosing a target sends nothing

- **WHEN** a target is chosen
- **THEN** no transfer starts and the queue is untouched

#### Scenario: An un-trusted device falls back to the code target

- **WHEN** the chosen device is removed from the trust store
- **THEN** the selection falls back to the code target and Send does not point at the removed device

### Requirement: The Send empty state does not name drag-and-drop on phone builds

On a phone build the Send panel's empty idle state SHALL NOT invite the user to drag or drop
files, because the platform has no drag-and-drop and the webview never reports one. It SHALL
instead describe the tap that actually works.

The gate SHALL be the platform form factor, not the pointer type and not the viewport
width, because the absence of drag-and-drop is a property of the operating system. A
desktop window dragged narrow, and a touchscreen laptop, SHALL keep the drag wording.

The drop-target markup itself SHALL be left in place unchanged. It is inert on a phone
because no drag event ever arrives, and removing it would fork the card's chrome by
platform for no gain.

#### Scenario: Phone empty state describes tapping

- **WHEN** the Send panel renders its empty idle state on an Android or iOS build
- **THEN** its copy describes adding files by tapping, and contains no mention of dragging
  or dropping

#### Scenario: Desktop keeps the drag wording

- **WHEN** the Send panel renders its idle state on a desktop build, at any window width
  and with any pointer type
- **THEN** the empty state keeps its existing drag-and-drop wording, and dragging files onto
  the card still works

### Requirement: A floating add button is the Send screen's one add affordance on every platform

While the Send panel is idle, a floating add button SHALL be present on the Send screen in both
idle shapes — the empty state and the populated queue grid — on every platform, phone and
desktop alike. It SHALL NOT be present in any non-idle send state, where the queue is no longer
editable.

It SHALL be the only add affordance the queue grid offers. The grid SHALL hold queued file tiles
and nothing else, because an affordance that is the grid's last item is off-screen on a long
queue, which is exactly when the user reaches for it.

The button SHALL be anchored to the trailing bottom corner of the panel's status zone, above
the anchored action zone, so it never covers the send target picker or the Send button. It
SHALL float above the scrolling queue rather than scroll with it, so it stays reachable
however long the queue is. Because it floats over the grid on every platform, the queue's
scroll container SHALL carry bottom padding on every platform, so the last row of tiles can
always be scrolled clear of the button.

The button SHALL meet the coarse-pointer hit-area minimum by growing, as the primary way to
add files.

On the empty shape the mascot card is itself a click target for the same action, so that shape
carries two ways to do one thing. This doubling is accepted deliberately: the button SHALL stay
in the same corner across both idle shapes rather than appearing when the first file is queued,
because a floating control is findable only if its position does not depend on state.

#### Scenario: The button is present in both idle shapes

- **WHEN** the Send screen is idle, with no files queued and then with several queued
- **THEN** the floating add button is visible in the trailing bottom corner in both cases

#### Scenario: Every platform shows the button

- **WHEN** the Send screen renders its idle state on a desktop build, at any window width, and
  again on a phone build
- **THEN** the floating add button is present in the same corner in both, and it is the only
  add control the queue grid offers

#### Scenario: The queue grid holds tiles only

- **WHEN** the Send queue grid renders with files queued, on any platform
- **THEN** every cell in the grid is a queued file tile, and no cell is an add affordance

#### Scenario: The button does not cover the action zone

- **WHEN** the Send screen is idle with files queued, so the action zone shows the target
  picker and the Send button
- **THEN** the floating add button sits clear of both, and every one of the three controls
  can be activated

#### Scenario: The button stays put while the queue scrolls

- **WHEN** the queue holds more files than fit and the user scrolls it
- **THEN** the floating add button stays in the same place on screen

#### Scenario: The last row can be scrolled clear of the button

- **WHEN** the queue is scrolled to its end on any platform
- **THEN** the final row of tiles sits above the floating add button rather than beneath it

#### Scenario: The button is absent once a send starts

- **WHEN** the Send panel leaves the idle state
- **THEN** the floating add button is gone

### Requirement: The floating add button opens one sheet offering files and photos

On a phone build, activating the floating add button SHALL open a bottom sheet offering exactly
two choices: one for files and one for photos. On a desktop build there is no sheet and the
button opens the file picker directly.

Choosing files SHALL open the platform's native file picker,
the same one the app already uses, and any files chosen SHALL be appended to the queue.
Choosing photos SHALL open the platform's own photo picker, offering both photos and videos,
and anything chosen SHALL be appended to the same queue in the same way. Neither choice SHALL
carry a preview marker.

The app SHALL queue and send whatever the picker hands back exactly as it is, with no
conversion, re-encoding, or downscaling of any kind. An item the app cannot decode for a
preview SHALL keep the queue's generic tile rather than being converted so it can be
previewed.

Where the platform's own picker hands back a converted rendition rather than the original
asset, the app SHALL queue that rendition as-is: it SHALL NOT convert it further, and SHALL NOT
try to undo the conversion.

The sheet SHALL dismiss itself before the native picker is presented, so the two surfaces are
never stacked.

The sheet SHALL carry an accessible name, so a screen reader announces what the surface is
rather than an unnamed dialog. It SHALL NOT carry a description beside it: the two rows say what
the choices are more precisely than a sentence about them would.

#### Scenario: The sheet offers both choices

- **WHEN** the user taps the floating add button on a phone build
- **THEN** a bottom sheet opens showing a files choice and a photos choice, neither carrying a
  preview marker

#### Scenario: Files opens the working picker

- **WHEN** the user chooses files and picks one or more files
- **THEN** the sheet is closed and the chosen files are appended to the send queue, exactly
  as picking from the empty state does today

#### Scenario: Photos opens the platform's photo picker

- **WHEN** the user chooses photos
- **THEN** the sheet is closed and the platform's own photo picker is presented, showing
  photos and videos

#### Scenario: Picked photos and videos join the queue

- **WHEN** the user selects one or more items in the photo picker
- **THEN** they are appended to the send queue with their name and size, and they send and
  preview through the same path as a file picked from the file picker

#### Scenario: The app converts nothing

- **WHEN** an item reaches the queue from either picker
- **THEN** it is sent byte for byte as the picker handed it over, in that format

#### Scenario: A format the app cannot preview keeps its tile

- **WHEN** an item is queued whose format the app cannot decode for a preview
- **THEN** its tile shows the generic file tile with its extension rather than a thumbnail
- **AND** it is not converted so that it could be previewed

#### Scenario: The platform converted it first

- **WHEN** the platform's photo picker hands back a converted rendition instead of the original
  asset, as iOS does when it returns a JPEG for a HEIC
- **THEN** that rendition is what is queued and sent, unchanged
- **AND** the app neither converts it further nor tries to recover the original

#### Scenario: Dismissing the sheet changes nothing

- **WHEN** the user dismisses the sheet without choosing
- **THEN** the queue is unchanged and the Send screen returns to where it was

#### Scenario: Cancelling either picker changes nothing

- **WHEN** the user opens either picker from the sheet and cancels it without choosing
- **THEN** the queue is unchanged and no error is shown

#### Scenario: The sheet is named for assistive technology

- **WHEN** the sheet opens on a phone build
- **THEN** assistive technology announces it by name rather than as an unnamed dialog

### Requirement: Both idle add affordances reach files the same way

Both of the Send panel's idle add affordances — the floating add button and tapping the empty
state — SHALL route through one entry point, so what happens is decided by the platform and not
by which surface was touched.

On a phone build that entry point SHALL open the files-and-photos sheet from either surface.
Neither SHALL jump straight to the native file picker, so the two choices are offered wherever
the user reaches for "add".

On desktop builds both SHALL open the file picker directly, with no intermediate sheet.

#### Scenario: The empty state opens the sheet on a phone

- **WHEN** the user taps the Send empty state on a phone build
- **THEN** the same sheet opens as from the floating add button, rather than the native file
  picker

#### Scenario: Desktop keeps the direct picker

- **WHEN** the user clicks the Send empty state or the floating add button on a desktop build
- **THEN** the native file picker opens immediately, with no sheet in between

### Requirement: The Send panel reports a pick that is still in flight

From the moment the app asks the platform for a picker until the picker's result has been
resolved into queue entries, the Send panel SHALL report that it is working, whichever way the
pick was started — the empty state or the floating add button — and for either picker, files or
photos.

Where the report goes follows which idle shape is on screen, because the two shapes have
different problems:

- **With files already queued**, the report SHALL occupy the anchored **action zone**, in the
  place of the send target and the Send button. That zone is anchored and does not scroll, so a
  long queue cannot carry the report out of view.
- **With nothing queued**, the report SHALL appear inside the empty state, below the mascot, in
  place of that surface's usual invitation copy. The action zone SHALL stay collapsed. Putting
  the report there instead would make an absent zone appear and displace the card above it, and
  there is no Send control to stand in for on this shape.

While files are queued and the report is showing, the Send control SHALL NOT be present.
Starting a send over a selection that has not finished arriving SHALL be impossible because
there is no control to activate, rather than because a control is present and refuses.

The report SHALL be indeterminate. It SHALL NOT show a count of items, a percentage, a progress
bar, or an estimate. The platform reports nothing about a pick until it reports everything, so
no such number exists to show while the wait is happening, and one presented would be invented.

The report SHALL be announced to assistive technology, once, as a sentence saying what is being
waited on.

On both shapes the report and the copy it replaces SHALL swap in place, crossfading rather than
cutting, and neither SHALL displace the other during the swap: the two occupy one slot, so the
transition costs no layout and nothing around them moves. The motion is decorative and SHALL
collapse under a reduced-motion preference, leaving the swap instant.

While a pick is in flight the Send screen SHALL refuse to start a second one: the empty state
and the floating add button each SHALL do nothing when activated. The refusal itself SHALL be
silent — no surface SHALL change size or grow an indicator of its own because it was activated,
since the report is already on screen saying why nothing happened, and a surface that resizes
under a finger that has just tapped it is worse than one that waits. On the empty shape the copy
swap described above is the report, not a reaction to being tapped, and happens whether the pick
was started from that surface or another.

A pick that ends without adding anything — the user cancelled, or the platform handed back
nothing — SHALL clear the report and restore the idle surface unchanged, with no error and no
message. A pick that fails SHALL do the same.

The report SHALL NOT block or hide the queue that is already there. Tiles already in the queue
stay visible and stay scrollable while the new pick resolves.

#### Scenario: A queued selection reports in the action zone

- **WHEN** a pick is in flight over a queue that already holds files
- **THEN** the anchored action zone shows an indeterminate indicator and a line saying the files
  are being got ready, and the queued tiles stay visible and scrollable

#### Scenario: An empty queue reports under the mascot

- **WHEN** a pick is in flight with nothing queued
- **THEN** the empty state shows an indeterminate indicator and the same line below its mascot,
  the mascot stays, and the action zone stays collapsed rather than appearing

#### Scenario: A send cannot be started over an incomplete selection

- **WHEN** a pick is in flight over a queue that already holds files
- **THEN** the Send control is not present in the action zone, and no send can be started until
  the pick resolves

#### Scenario: The report and the copy it replaces crossfade in place

- **WHEN** a pick starts on either idle shape, and again when it resolves
- **THEN** the report and the copy it replaces fade into each other in the same slot, and
  nothing around them moves — not the action zone's height, not the queue, not the empty card

#### Scenario: Reduced motion makes the swap instant

- **WHEN** the user prefers reduced motion and a pick starts or resolves
- **THEN** the shapes swap with no crossfade, and everything else about the report is unchanged

#### Scenario: The report stays on screen while the queue is scrolled

- **WHEN** a pick is in flight over a queue long enough to scroll, and the user scrolls it
- **THEN** the report remains visible, because the action zone is anchored and does not scroll
  with the queue

#### Scenario: The add button does not change shape while picking

- **WHEN** a pick is in flight over a queue that already holds files
- **THEN** the floating add button keeps its usual appearance and size and shows no indicator of
  its own

#### Scenario: The report claims no count and no progress

- **WHEN** the Send screen is reporting a pick after a large selection
- **THEN** no count of items, percentage, progress bar, or time estimate is shown

#### Scenario: The report is announced as one sentence

- **WHEN** the report appears
- **THEN** assistive technology announces what is being waited on, once, without a separate
  generic loading label beside it

#### Scenario: A second pick cannot be started while one is in flight

- **WHEN** a pick is in flight and the user activates the empty state or the floating add button
- **THEN** nothing is started, no sheet or picker opens, and the surface's appearance is
  unchanged

#### Scenario: Picked items replace the report

- **WHEN** the platform hands back the picked items and they are resolved into queue entries
- **THEN** the report clears, the queue shows the new tiles, and the action zone returns to the
  send target picker and the Send button

#### Scenario: A cancelled pick restores the idle surface

- **WHEN** the user dismisses the picker without choosing anything, or the pick fails
- **THEN** the report clears, the idle surface returns exactly as it was, the queue is
  untouched, and no error is shown

### Requirement: The send queue survives a send that never sent

A send that ends without delivering its files SHALL leave the file selection exactly as it was.
This SHALL hold for every way a send can end that way and for either target:

- the user cancels it,
- the chosen device is offline or otherwise unreachable,
- the chosen device turns the offer down or is busy,
- the send fails to start at all.

Only two things SHALL empty the queue: the user emptying it (removing every file, or leaving the
done screen with "Send more files"), and a send that finished.

After any of those endings the Send panel SHALL return to its idle screen with the queue still
listed, the chosen target still chosen, and the failure, if there was one, reported inline above
the panel rather than as a toast. Starting the same send again SHALL need nothing re-picked.

#### Scenario: An offline device does not cost the selection

- **WHEN** files are queued and sent to a trusted device that is not online
- **THEN** the Send screen shows the failure inline and returns to idle
- **AND** the same files are still queued, in the same order, with the same target chosen

#### Scenario: A declined offer does not cost the selection

- **WHEN** the chosen device turns the offer down, or auto-declines because it is busy
- **THEN** the Send panel returns to idle with the queue and the chosen target untouched

#### Scenario: A send that fails to start does not cost the selection

- **WHEN** starting a send is refused before anything is served, for a code target or a device
  target
- **THEN** the failure is shown inline and the queue is untouched

#### Scenario: Failing and cancelling end the same way

- **WHEN** a trusted send is cancelled, and then an identical one fails because the device is
  offline
- **THEN** the panel lands in the same idle state both times, with the same queue

#### Scenario: Retrying needs no re-picking

- **WHEN** a send has failed and the user presses Send again once the other device is back
- **THEN** the transfer starts from the queue that was already there, with no picker involved

### Requirement: The live progress display is one gauge and at most one moving figure

While a transfer is running, the panel's status zone SHALL be composed of, in this order and
nothing else:

1. **One circular progress gauge** carrying the percentage as a whole number. The gauge is the
   surface's largest element, it is tinted with the screen's accent (`--tint` for the filled
   arc, the muted track behind it), and the percent sits inside it. There SHALL NOT be a
   second progress indicator, linear or otherwise, on the screen.
2. **One line naming what is moving** — the current filename, with `· <n> of <total>` appended
   only when the transfer carries more than one file. It SHALL be ordinary single-line text,
   not a monospace read-out.

   The name SHALL be reduced before it is shown: anything up to the last path separator is
   dropped, so only the file's own name can reach the line whatever a platform's picker hands
   over, and a name longer than a fixed character limit is elided in the middle, keeping the
   start and the end (so the extension stays readable). The limit is a character count, not
   only CSS truncation, so the line's width is bounded whatever its container does.
3. **At most one moving figure**: bytes moved against the total (`128 MB / 2.1 GB`). It SHALL
   be set in tabular numerals so counting up does not reflow the line, and it SHALL be visibly
   quieter than the gauge and the filename.

The screen SHALL NOT show a byte rate, a transfer speed, or a time estimate in any state. The
phase word stays in the shared top bar (see the headerless-surface requirement) and the
percentage is the gauge's, so no state shows the same fact twice.

A phase with no measurable progress — a send getting ready, a receive connecting, either side
cancelling — SHALL show the shared spinner and its label rather than a gauge reading zero.

#### Scenario: Running transfer shows one gauge

- **WHEN** either transfer screen is in its sending or receiving state
- **THEN** a single circular gauge carries the whole-number percentage, tinted with that
  screen's accent, and no linear progress bar is rendered anywhere on the screen

#### Scenario: No rate and no estimate

- **WHEN** a transfer runs, whatever its speed, size, or duration
- **THEN** no transfer speed, byte rate, or time-remaining figure appears on the screen

#### Scenario: The bytes line does not reflow

- **WHEN** the bytes-moved figure counts up during a transfer
- **THEN** it is rendered in tabular numerals and the line's other content does not shift
  position as the digits change

#### Scenario: A long filename does not deform the surface

- **WHEN** the file being transferred has a very long name
- **THEN** the name is cut to the fixed character limit with the middle elided, on one line of
  ordinary text, and the gauge and the bytes line keep their position and size

#### Scenario: Only the file's own name is shown

- **WHEN** the name reported for the file being transferred contains path separators
- **THEN** only the part after the last separator is shown, on either platform's separator

#### Scenario: The extension survives the cut

- **WHEN** a name is long enough to be elided
- **THEN** the end of the name is kept along with the start, so its extension is still
  readable

#### Scenario: Multi-file transfers say where they are

- **WHEN** a transfer carries more than one file
- **THEN** the filename line also reports the position in the set, and a single-file transfer
  reports the name alone

#### Scenario: Indeterminate phases show the spinner

- **WHEN** a send is getting ready, a code receive is connecting, or either side is stopping
- **THEN** the shared spinner and its label are shown, and no gauge reading zero percent
  appears

#### Scenario: The gauge fits both panel layouts

- **WHEN** the progress display renders in the compact card and in the regular (roomy) one
- **THEN** the gauge is centered in the status zone at a size that fits both, with no
  platform-specific or breakpoint-specific progress code

### Requirement: A device transfer's pre-transfer screen is one view that spans the wait and the answer

For a trusted-device target, everything before bytes move SHALL be one view that stays mounted from
the moment the transfer is arranged until progress replaces it. The answer arriving SHALL NOT swap the
screen: the view SHALL keep its position and size, its entrance animation SHALL NOT replay, and only
the mark and the label SHALL change.

This is a structural requirement, not a styling one. Panels SHALL NOT render this view from two
sibling branches keyed on the transfer status, because that destroys and recreates it on the
transition and replays every entrance animation inside it.

Establishing the connection and moving the bytes stay two screens: the view SHALL hand off to the
progress display at the first progress report, and SHALL NOT carry a gauge, a percentage, or a byte
figure itself.

A code target keeps its own screens (getting files ready, then the code) and SHALL NOT be folded into
this view: there is no device to name until someone brings the code.

#### Scenario: The answer does not swap the screen

- **WHEN** a trusted send is waiting on an answer and the other device accepts
- **THEN** the same view stays on screen with its layout unchanged, its entrance animation does not
  replay, and the only things that change are the mark and the label

#### Scenario: Progress takes over

- **WHEN** the first progress report arrives for a device transfer
- **THEN** the connecting view is replaced by the progress display, and no gauge or byte figure ever
  appeared in the connecting view

#### Scenario: A code send keeps its own screens

- **WHEN** a send is aimed at the code target
- **THEN** it shows the getting-ready screen and then the code screen, and never the device connecting
  view

### Requirement: The connecting view's mark carries the state and its label names the device

The connecting view SHALL be a single mark above a single label, and nothing else. There SHALL NOT be
a device illustration, a second heading, or explanatory sentences about what the other device has to
do: the mark says which state the transfer is in and the label says who it is with.

The mark SHALL be the shared spinner while the transfer is still being arranged, and SHALL become a
check the moment the other device says yes. Both SHALL sit in the same fixed frame the completion
screen's mark uses, so the swap changes no dimension on the screen, and the check SHALL arrive with
the app's existing entrance pop rather than a new animation.

The label SHALL be one short line that names the other device and nothing more, in the app's ordinary
voice: waiting on that device while the answer is outstanding, connecting to it once the answer has
come. It SHALL NOT restate what the mark already shows and SHALL NOT explain the pairing model.

The view SHALL NOT show a code, a QR, or any other copyable value: a device transfer is derived from
the pairing keys, so there is nothing here for a person to read out.

A receive has no answer to wait on, so its mark SHALL stay the spinner for the whole view. The check
means an answer arrived, and inventing one for a transfer that was already accepted would make the
mark say something that did not happen.

#### Scenario: Waiting on a yes

- **WHEN** a trusted send is waiting for the other device to answer
- **THEN** the view shows the spinner above one line naming that device, with no device illustration
  and no sentence explaining that the device has to accept

#### Scenario: The mark becomes a check

- **WHEN** the other device accepts a trusted send
- **THEN** the spinner is replaced in place by a check that enters with the app's entrance pop, the
  label changes to name connecting to that device, and no dimension on the screen changes

#### Scenario: A receive shows one waiting mark

- **WHEN** the connecting view renders for an accepted incoming transfer
- **THEN** the mark is the spinner and stays the spinner until progress replaces the view

#### Scenario: No code on a device transfer

- **WHEN** the connecting view renders for either direction
- **THEN** no code, QR, or copyable value appears on it

### Requirement: A send waiting too long on a yes says so

A trusted send waits on the other device's answer with nothing else on screen to explain a silence, so
after a fixed delay the view SHALL add one quiet line with the one thing to check, in the app's
ordinary voice. The label above it SHALL keep naming the device, so the added line is the only change.

The line SHALL be dropped the moment the answer arrives. A receive SHALL NOT show it: nothing there is
waiting on a yes.

#### Scenario: A silent wait is explained

- **WHEN** a trusted send has waited past the delay without an answer
- **THEN** one quiet line appears beneath the label with the one thing to check, and the mark and the
  label above it are unchanged

#### Scenario: A prompt answer never shows the hint

- **WHEN** the other device accepts before the delay elapses
- **THEN** the hint never appears and the view moves straight to the connecting mark and label

#### Scenario: A late answer clears the hint

- **WHEN** the other device accepts after the hint has appeared
- **THEN** the hint is removed as the mark becomes a check

#### Scenario: A receive has no such hint

- **WHEN** the connecting view renders for an accepted incoming transfer, however long it takes
- **THEN** no waiting-on-a-yes hint appears


### Requirement: The Send and Receive top bar warns when a connection is missing

The Send and the Receive top bar SHALL show a connection warning when either link the app
depends on is down, and SHALL show nothing at all when both are up or not yet known. The
warning SHALL be a single quiet icon at the trailing edge of the title row, in a warning
tint, carrying an accessible name and a disclosure that reveals one short line naming what is
wrong and the one thing to try.

The warning SHALL NOT occupy vertical room of its own: it renders in the row the heading
already reserves, so the bar's height is identical warning or no warning, and content below
does not shift when a link changes state.

The warning SHALL be the same component on both screens, so its icon, tint, wording, and
disclosure cannot drift between them. Both screens SHALL read one shared source of link
state rather than each tracking its own.

Where a transfer screen already has something at the trailing edge, the connection warning
SHALL render leading of it, because a missing connection outranks any advice about the
transfer itself. Neither indication SHALL be hidden to make room for the other.

The warning SHALL NOT disable any control on the screen, and SHALL NOT replace or suppress a
transfer error surface: a failure that happens anyway still reports where failures report.

#### Scenario: A healthy app shows nothing

- **WHEN** Send or Receive is open and both links are up
- **THEN** no connection warning is rendered anywhere in the bar

#### Scenario: A launching app shows nothing

- **WHEN** Send or Receive is open and a link's state is not yet known
- **THEN** no connection warning is rendered, and none flashes on the way to a known state

#### Scenario: A down link warns in the bar

- **WHEN** either link is down while Send or Receive is open
- **THEN** a warning icon appears at the trailing edge of the title row, and revealing it
  shows one line naming what is wrong and what to try

#### Scenario: The two screens warn identically

- **WHEN** the same link is down and Send and Receive are compared
- **THEN** both render the same warning, from the same component, with the same wording

#### Scenario: The bar does not resize or reflow

- **WHEN** a link goes down and then comes back while a transfer screen is open
- **THEN** the bar's height is unchanged throughout and nothing below it moves

#### Scenario: Both trailing indications coexist on Send

- **WHEN** Send is idle with a big selection and a link is down
- **THEN** both the connection warning and the big-transfer warning are visible, the
  connection warning leading, and neither is dropped

#### Scenario: A warning blocks nothing

- **WHEN** a link is down on Send with files selected
- **THEN** the send can still be started, and the controls are not disabled

#### Scenario: A warning is not an error surface

- **WHEN** a transfer fails while a connection warning is showing
- **THEN** the failure is reported in the screen's existing error surface, and the warning
  neither replaces it nor is replaced by it
