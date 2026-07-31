# swipe-gestures Specification

## Purpose
TBD - created by archiving change frontend-mobile-polish. Update Purpose after archive.
## Requirements
### Requirement: Horizontal swipes resolve by one fixed arbitration order

Several horizontal gestures share the app. Which one owns a touch SHALL be decided by one fixed
order, evaluated when the pointer goes down and again on the first 10 CSS pixels of travel, and
SHALL NOT depend on listener registration order or on which component mounted first:

1. A pointer that is not a touch is ignored. Pointer devices do not drag.
2. A touch starting within 24 CSS pixels of the left screen edge belongs to the navigation
   drawer, and no other consumer inspects it.
3. A gesture whose vertical travel exceeds its horizontal travel after 10 pixels is released to
   scrolling, and SHALL NOT be re-claimed for the remainder of that touch.
4. A gesture inside a row that declares itself swipeable belongs to that row.
5. Any remaining gesture belongs to the mode pager.

#### Scenario: Edge strip belongs to the drawer alone

- **WHEN** a touch begins within 24 CSS pixels of the left edge and travels right
- **THEN** the navigation drawer opens, and neither the mode pager nor any row swipe responds

#### Scenario: Vertical intent releases to scrolling and stays released

- **WHEN** a touch on a scrollable surface travels further vertically than horizontally
- **THEN** the surface scrolls, no horizontal gesture activates, and turning the finger
  horizontal later in the same touch does not start one

#### Scenario: Mouse dragging does nothing

- **WHEN** a mouse is pressed and dragged horizontally across the transfer screen
- **THEN** no gesture activates and the pointer behaves as it does today

#### Scenario: Arbitration lives in one place

- **WHEN** a new horizontal gesture is added to the app
- **THEN** it declares what it refuses through the shared arbitration, and the reserved edge
  strip is read from a single shared definition rather than repeated

### Requirement: A gesture commits on distance or velocity, and otherwise springs back

A horizontal gesture SHALL follow the finger while it is in progress, SHALL commit when travel
passes its threshold fraction of the surface width or when release velocity passes its
threshold, and SHALL animate back to its starting position otherwise. A gesture SHALL NOT
commit on release alone.

#### Scenario: Short slow drag springs back

- **WHEN** a gesture is released below both its distance and velocity thresholds
- **THEN** the surface animates back to where it started and nothing changes

#### Scenario: Fast flick commits

- **WHEN** a gesture is released above its velocity threshold but below its distance threshold
- **THEN** it commits

#### Scenario: Content tracks the finger

- **WHEN** a gesture is in progress
- **THEN** the affected surface moves with the finger rather than waiting for release

### Requirement: The transfer screen pages between Send and Receive by swipe

On touch devices the transfer screen SHALL switch between Send and Receive by horizontal swipe,
in addition to tapping the switcher and the keyboard shortcuts. Paging SHALL NOT wrap: swiping
past the outer edge springs back. Committing to the other mode SHALL be identical to selecting
it any other way.

#### Scenario: Swipe changes mode

- **WHEN** the user swipes horizontally across the transfer screen on a phone
- **THEN** the app moves to the other mode, the switcher reflects it, and the mode is the same
  state a tap would have produced

#### Scenario: Outer edges do not wrap

- **WHEN** the user swipes further outward while already on the first or last mode
- **THEN** the surface springs back and the mode does not change

#### Scenario: Swiping over the file queue still pages

- **WHEN** the send queue holds enough files to scroll and the user swipes horizontally over it
- **THEN** the mode pages, and a vertical drag over the same area scrolls the queue instead

#### Scenario: Tap and shortcuts are unaffected

- **WHEN** the user taps the switcher or presses the mode shortcut
- **THEN** the mode changes as it does today

### Requirement: A paired device row is removed by swipe, with confirmation intact

On a coarse pointer, a paired device row SHALL reveal its remove action by horizontal swipe
instead of showing a destructive button in the row, because a thumb aiming at rename should not
be able to land on a destructive control beside it. On a fine pointer the destructive button
SHALL remain: a mouse hits a small target precisely, and a drag gesture is not available there,
so removing must not become unreachable.

Removing SHALL still require the existing confirmation either way, because revoking trust cannot
be undone without re-pairing and a swipe is easy to start by accident. Rename SHALL remain a
control in the row on both.

#### Scenario: Swipe reveals remove on touch

- **WHEN** the user swipes a paired device row on a coarse-pointer device
- **THEN** a remove action is revealed for that row

#### Scenario: Removal still confirms

- **WHEN** the user activates the remove action, however it was reached
- **THEN** the existing confirmation appears, and trust is revoked only after it is confirmed

#### Scenario: No destructive button beside rename on touch

- **WHEN** a paired device row renders on a coarse-pointer device
- **THEN** it shows no destructive control adjacent to rename

#### Scenario: Removal stays reachable with a mouse

- **WHEN** a paired device row renders on a fine-pointer device
- **THEN** the destructive control is present and removal does not depend on a gesture

#### Scenario: Rename is unchanged

- **WHEN** the user renames a paired device
- **THEN** it works as it does today, from a control in the row

### Requirement: The activity timeline refreshes by pull

The activity timeline SHALL reload by a downward pull gesture. The gesture SHALL only start
when the list is already scrolled to the top, so it cannot interrupt scrolling, and SHALL
resist past a maximum pull distance rather than dragging without limit.

#### Scenario: Pull at the top refreshes

- **WHEN** the timeline is scrolled to the top and the user pulls down past the trigger
  distance
- **THEN** the list reloads and a progress indication is shown while it does

#### Scenario: Pull mid-list scrolls

- **WHEN** the timeline is scrolled away from the top and the user drags down
- **THEN** the list scrolls and no refresh starts

#### Scenario: Short pull is abandoned

- **WHEN** the user pulls down below the trigger distance and releases
- **THEN** the list returns to rest and no reload happens

