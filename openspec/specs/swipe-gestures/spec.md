# swipe-gestures Specification

## Purpose
TBD - created by archiving change frontend-mobile-polish. Update Purpose after archive.
## Requirements
### Requirement: Horizontal swipes resolve by one fixed arbitration order

Horizontal gestures SHALL be claimed by one shared engine, and which gesture owns a touch SHALL
be decided by one fixed order, evaluated when the pointer goes down and again on the first 10 CSS
pixels of travel. It SHALL NOT depend on listener registration order or on which component
mounted first:

1. A pointer that is not a touch is ignored. Pointer devices do not drag.
2. A gesture whose vertical travel exceeds its horizontal travel after 10 pixels is released to
   scrolling, and SHALL NOT be re-claimed for the remainder of that touch.
3. A gesture inside a row that declares itself swipeable belongs to that row.
4. Any remaining horizontal gesture is unclaimed. No gesture owns the screen at large.

No region of the screen SHALL be reserved for a navigation gesture. Navigation is a bottom bar
and has no gesture of its own, so a horizontal touch anywhere on screen belongs to the surface
under the finger.

The shared engine SHALL remain the single definition of this order even while only one consumer
exists, so a future horizontal gesture declares what it refuses rather than adding a competing
set of listeners.

#### Scenario: Vertical intent releases to scrolling and stays released

- **WHEN** a touch on a scrollable surface travels further vertically than horizontally
- **THEN** the surface scrolls, no horizontal gesture activates, and turning the finger
  horizontal later in the same touch does not start one

#### Scenario: Mouse dragging does nothing

- **WHEN** a mouse is pressed and dragged horizontally across any screen
- **THEN** no gesture activates and the pointer behaves as it does today

#### Scenario: The screen edge is not reserved

- **WHEN** a horizontal gesture begins at the very left edge of the screen, inside a swipeable
  row
- **THEN** the row's gesture handles it, because no navigation gesture reserves that region

#### Scenario: Arbitration lives in one place

- **WHEN** a new horizontal gesture is added to the app
- **THEN** it declares what it refuses through the shared arbitration rather than registering
  independent listeners

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

### Requirement: The device list refreshes by pull

The paired-device list SHALL reload by a downward pull gesture. The gesture SHALL only start when
the list is already scrolled to the top, so it cannot interrupt scrolling, and SHALL resist past
a maximum pull distance rather than dragging without limit.

A downward drag from a resting top SHALL be claimed by the gesture rather than left to the
scroller's overscroll bounce, because a platform that has begun bouncing may abandon the touch
and the pull would be lost. An upward drag SHALL scroll normally.

The progress indication SHALL remain visible long enough to be seen, even when the reload
itself completes within a frame, so a deliberate gesture is always acknowledged.

Refreshing SHALL reset the screen's transient state along with its data: a partially entered
code and any open inline rename SHALL be cleared. A pairing code currently on display SHALL NOT
be regenerated, because another device may be part-way through entering it.

#### Scenario: Pull at the top refreshes

- **WHEN** the device list is scrolled to the top and the user pulls down past the trigger
  distance
- **THEN** the list reloads from the trust store and a progress indication is shown while it does

#### Scenario: Pull mid-list scrolls

- **WHEN** the device list is scrolled away from the top and the user drags down
- **THEN** the list scrolls and no refresh starts

#### Scenario: The pull is not lost to the overscroll bounce

- **WHEN** the user drags down repeatedly from the top of the device list
- **THEN** every such drag runs the pull gesture, and none of them is swallowed by the
  scroller bouncing instead

#### Scenario: A fast reload is still announced

- **WHEN** the reload completes almost immediately
- **THEN** the progress indication is still visible for long enough to be seen

#### Scenario: Refreshing clears stale input

- **WHEN** the user has typed part of a code, or opened a rename, and then pulls to refresh
- **THEN** the field is cleared and the rename closes, while a pairing code on display is
  left untouched

#### Scenario: Short pull is abandoned

- **WHEN** the user pulls down below the trigger distance and releases
- **THEN** the list returns to rest and no reload happens

