## ADDED Requirements

<!-- Four requirements below are restatements, not new behaviour. Each one names the dashed add
     tile in a scenario header, and a `## MODIFIED Requirements` block may not drop a scenario
     (`openspec archive` aborts with "current spec contains scenario(s) not present in the
     modified block"). So each is re-added under a changed header and its old header is listed
     under `## REMOVED Requirements`. At archive time they are appended to the end of the main
     spec and have to be moved back into reading order by hand. -->

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Send idle copy does not name drag-and-drop on phone builds

**Reason**: Half of what it governed no longer exists. It covered two idle surfaces — the empty
state and the dashed add tile — and the tile has been removed from the queue grid, so its "Phone
add tile describes tapping" scenario has no successor. Replaced rather than modified for that
reason. The rule itself is unchanged for the surface that remains.

**Migration**: None. The replacement requirement above keeps the empty state's phone wording,
the desktop wording, the form-factor gate, and the inert drop-target markup exactly as they
were.

### Requirement: A floating add button is the Send screen's thumb-reachable entry point on phone builds

**Reason**: The button is no longer phone-only, so this requirement's "Desktop shows no floating
button" scenario now asserts the opposite of the intended behaviour and has no successor to be
modified into. It also named the dashed add tile as desktop's way to add files, which no longer
exists.

**Migration**: None for the user on a phone — placement, hit area, scroll behaviour, and absence
outside the idle state are all carried over unchanged. Desktop users gain the button and lose
the dashed tile in the queue grid; the empty state is unchanged and remains a click target.

### Requirement: Every idle add affordance on a phone opens the same sheet

**Reason**: It enumerated three affordances, one of which — the dashed add tile — has been
removed, so its "The add tile opens the sheet on a phone" and "The add tile is not removed on a
phone" scenarios have no successors. The second of those two now asserts the opposite of the
intended behaviour.

**Migration**: None. The replacement requirement above keeps the rule for the two affordances
that remain, on both platforms.

### Requirement: The Send panel reports a picker call that is still in flight

**Reason**: Its "The add tile and the add button do not change shape while picking" scenario is
named after a surface that no longer exists, and the requirement's prose enumerated the tile as
one of three ways a pick can be started. Replaced rather than modified because the scenario had
to be renamed, which a modified block cannot express.

**Migration**: None. The replacement requirement above is the same behaviour with the tile
dropped from every enumeration.
