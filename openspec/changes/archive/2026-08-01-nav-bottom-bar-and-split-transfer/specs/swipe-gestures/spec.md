## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: The transfer screen pages between Send and Receive by swipe

**Reason**: Send and Receive are now separate top-level destinations rather than two modes of one
screen, so there is no pair of panels to page between. The gesture was also the weakest of the
three routes into a mode change: only the active panel was ever mounted, so the drag translated
one panel across empty background with nothing to preview, and the commit was a hard cut
followed by a fly-in.

Lateral swipe between top-level destinations is additionally against both platforms'
conventions: it is a top-tab pattern, not a bottom-bar one, and it would compete with in-content
gestures — which is precisely why this gesture required a reserved edge strip and a
vertical-intent release rule.

**Migration**: Switching between Send and Receive is a tap on the bottom bar, a click in the
desktop sidebar, or a keyboard shortcut. All three land on the same route.

### Requirement: The activity timeline refreshes by pull

**Reason**: The activity feature is removed. It rendered fixed sample data, was never connected
to any command or storage, and its own plan referenced an application core that no longer exists.

**Migration**: Pull-to-refresh is retained and retargeted to the paired-device list, which has a
real reload to perform. See "The device list refreshes by pull" above.
