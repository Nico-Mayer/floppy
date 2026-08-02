## ADDED Requirements

### Requirement: Send idle copy does not name drag-and-drop on phone builds

On a phone build the Send panel's idle surfaces SHALL NOT invite the user to drag or drop
files, because the platform has no drag-and-drop and the webview never reports one. This
covers both idle shapes: the empty state and the dashed add tile in the queue grid. Each
SHALL instead describe the tap that actually works.

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

#### Scenario: Phone add tile describes tapping

- **WHEN** the Send queue grid renders its dashed add tile on an Android or iOS build
- **THEN** the tile's supporting line does not mention dropping

#### Scenario: Desktop keeps the drag wording

- **WHEN** the Send panel renders its idle state on a desktop build, at any window width
  and with any pointer type
- **THEN** the empty state and the add tile keep their existing drag-and-drop wording, and
  dragging files onto the card still works

### Requirement: A floating add button is the Send screen's thumb-reachable entry point on phone builds

On a phone build, while the Send panel is idle, a floating add button SHALL be present on
the Send screen in both idle shapes: the empty state and the populated queue grid. It SHALL
NOT be present on desktop builds, and SHALL NOT be present in any non-idle send state, where
the queue is no longer editable.

The button SHALL be anchored to the trailing bottom corner of the panel's status zone, above
the anchored action zone, so it never covers the send target picker or the Send button. It
SHALL float above the scrolling queue rather than scroll with it, so it stays reachable
however long the queue is.

The button SHALL meet the coarse-pointer hit-area minimum by growing, as the primary way to
add files on that platform.

#### Scenario: The button is present in both idle shapes

- **WHEN** the Send screen is idle on a phone build, with no files queued and then with
  several queued
- **THEN** the floating add button is visible in the trailing bottom corner in both cases

#### Scenario: The button does not cover the action zone

- **WHEN** the Send screen is idle on a phone build with files queued, so the action zone
  shows the target picker and the Send button
- **THEN** the floating add button sits clear of both, and every one of the three controls
  can be tapped

#### Scenario: The button stays put while the queue scrolls

- **WHEN** the queue holds more files than fit and the user scrolls it
- **THEN** the floating add button stays in the same place on screen

#### Scenario: The button is absent once a send starts

- **WHEN** the Send panel leaves the idle state
- **THEN** the floating add button is gone

#### Scenario: Desktop shows no floating button

- **WHEN** the Send screen renders on a desktop build, at any window width
- **THEN** no floating add button is shown, and the add tile and empty state remain the way
  to add files

### Requirement: The floating add button opens one sheet offering files and the photo library

Activating the floating add button SHALL open a bottom sheet offering exactly two choices:
one for files and one for the photo library. Choosing files SHALL open the platform's native
file picker, the same one the app already uses, and any files chosen SHALL be appended to
the queue. Choosing the photo library SHALL do nothing yet and SHALL carry the preview
marker, since that path is not built.

The sheet SHALL dismiss itself before the native picker is presented, so the two surfaces are
never stacked.

#### Scenario: The sheet offers both choices

- **WHEN** the user taps the floating add button
- **THEN** a bottom sheet opens showing a files choice and a photo library choice

#### Scenario: Files opens the working picker

- **WHEN** the user chooses files and picks one or more files
- **THEN** the sheet is closed and the chosen files are appended to the send queue, exactly
  as picking from the empty state does today

#### Scenario: Photo library is honest about being unbuilt

- **WHEN** the sheet renders
- **THEN** the photo library choice carries a preview marker, stays focusable and tappable,
  and tapping it changes nothing in the queue

#### Scenario: Dismissing the sheet changes nothing

- **WHEN** the user dismisses the sheet without choosing
- **THEN** the queue is unchanged and the Send screen returns to where it was

### Requirement: Every idle add affordance on a phone opens the same sheet

On a phone build, all of the Send panel's idle add affordances SHALL route through the one
sheet: the floating add button, tapping the empty state, and tapping the dashed add tile in
the queue grid. None of them SHALL jump straight to the native file picker, so the two
choices are offered wherever the user reaches for "add".

On desktop builds those surfaces SHALL keep opening the file picker directly, with no
intermediate sheet.

#### Scenario: The empty state opens the sheet on a phone

- **WHEN** the user taps the Send empty state on a phone build
- **THEN** the same sheet opens, rather than the native file picker

#### Scenario: The add tile opens the sheet on a phone

- **WHEN** the user taps the dashed add tile in the queue grid on a phone build
- **THEN** the same sheet opens, rather than the native file picker

#### Scenario: Desktop keeps the direct picker

- **WHEN** the user clicks the Send empty state or the add tile on a desktop build
- **THEN** the native file picker opens immediately, with no sheet in between

#### Scenario: The add tile is not removed on a phone

- **WHEN** the Send queue grid renders on a phone build with files queued
- **THEN** the dashed add tile is still the last tile in the grid, alongside the floating
  add button
