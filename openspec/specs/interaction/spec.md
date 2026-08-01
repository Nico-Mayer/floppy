# interaction

## Purpose

How the app responds to a finger and to a pointer: hit-area minimums and where they come
from, one arbitration order for horizontal gestures, the swipe and pull gestures built on
it, haptic feedback at the moments that carry meaning, and which motion survives a
reduced-motion preference.

## Requirements

### Requirement: Every interactive control meets a 44px minimum hit area on coarse pointers

On coarse-pointer devices, every interactive control anywhere in the app SHALL have a hit
area of at least 44×44 CSS pixels. On fine-pointer devices control sizing SHALL be unchanged
from current desktop density. This requirement covers the whole app, not one screen: the
header, the navigation, dialogs and drawers, every page, and every panel.

A control MAY meet the minimum in one of two ways:

- **Grow** — the visible box itself reaches at least 44px.
- **Hit slop** — the visible box keeps its size, and an invisible region centred on it
  receives the pointer. That region SHALL be at least 48px in each axis and SHALL never be
  smaller than the control's own box, so the guarantee holds at every control size rather
  than depending on one. How far the slop extends beyond the visible box therefore varies
  with that box: a 24px control is surrounded by 12px of slop on each side, a 36px control
  by 6px.

#### Scenario: Coarse pointer meets the minimum everywhere

- **WHEN** the app runs on a coarse-pointer device, on any screen
- **THEN** every button, input, icon control, navigation row, and dialog action measures at
  least 44 CSS pixels in each hit-area dimension

#### Scenario: Fine pointer keeps desktop density

- **WHEN** the app runs with a mouse or trackpad
- **THEN** control sizes and page layout are unchanged from current desktop sizing, and no
  control has grown

#### Scenario: Slop does not move anything

- **WHEN** a control satisfies the minimum through hit slop rather than growth
- **THEN** its visible dimensions and the surrounding layout are identical on coarse and fine
  pointers

### Requirement: Destructive, primary, and navigation controls grow rather than slop

A control that is destructive, is the primary action of its surface, or navigates SHALL meet
the minimum by growing its visible box. Incidental and reversible controls MAY meet it with
hit slop. A person aiming at a destructive action must be able to see the target they are
hitting.

#### Scenario: Destructive control grows

- **WHEN** a destructive control renders on a coarse-pointer device
- **THEN** its visible box measures at least 44 CSS pixels in each dimension, whatever size
  variant the call site requested

#### Scenario: Incoming transfer actions are large

- **WHEN** an incoming transfer or pairing prompt renders on a phone
- **THEN** its accept and decline actions are full-width stacked controls of at least 44px, and
  decline is not immediately adjacent to accept along the same axis of travel

#### Scenario: Incidental control keeps its visual size

- **WHEN** a clear, copy, or dismiss control renders on a coarse-pointer device
- **THEN** its visible box is unchanged and its hit area measures at least 48 CSS pixels in
  each dimension

### Requirement: The minimum is enforced by the shared control primitives

The hit-area minimum SHALL be a property of the shared button and menu-row primitives,
derived from the size and variant a call site already selects, and SHALL NOT require
per-call-site classes. An explicit override SHALL exist for the cases where the derived
choice is wrong. No feature component SHALL carry its own hand-written touch-size class.

#### Scenario: A new control inherits the minimum

- **WHEN** a developer adds a control using a shared primitive without any touch-related class
- **THEN** that control already meets the minimum on coarse pointers

#### Scenario: No per-call-site touch classes remain

- **WHEN** the codebase is searched for hand-written coarse-pointer or minimum-height classes
  on feature components
- **THEN** none are found, and the behaviour they provided is supplied by the primitives

#### Scenario: Override is available where inference is wrong

- **WHEN** a call site needs the other treatment than the one its size implies
- **THEN** it can request grow or slop explicitly, and that request wins

### Requirement: Hit slop requires clearance and isolation

Hit slop SHALL only be used where it can actually receive the pointer and cannot steal from
a neighbour. The control SHALL have clearance from any ancestor that clips overflow of at
least the distance its slop extends, and SHALL NOT have another interactive element within
that same distance. Where either condition fails, the control SHALL grow instead.

The distance is derived, not fixed: it is half the difference between 48px and the control's
own size, so it is 12px for a 24px control and 6px for a 36px one.

#### Scenario: Clipped slop is not used

- **WHEN** a control sits closer to an overflow-hiding ancestor than its slop extends
- **THEN** it meets the minimum by growing, because the clipped region would not receive the
  pointer

#### Scenario: Adjacent controls both grow

- **WHEN** two interactive controls sit closer together than their slop would extend
- **THEN** both meet the minimum by growing, so neither one's hit area extends over the other's
  visible box

### Requirement: Code text stays at 16px or larger on coarse pointers

Code entry and code display text SHALL render at 16 CSS pixels or larger on coarse-pointer
devices, so focusing a code field does not trigger the mobile browser's zoom.

#### Scenario: Code input does not trigger mobile zoom

- **WHEN** the receive code input or the pairing code input is focused on a coarse-pointer
  device
- **THEN** its text size is at least 16 CSS pixels and the webview does not zoom

### Requirement: Horizontal swipes resolve by one fixed arbitration order

Horizontal gestures SHALL be claimed by one shared engine, and which gesture owns a touch
SHALL be decided by one fixed order, evaluated when the pointer goes down and again on the
first 10 CSS pixels of travel. It SHALL NOT depend on listener registration order or on
which component mounted first:

1. A pointer that is not a touch is ignored. Pointer devices do not drag.
2. A gesture whose vertical travel exceeds its horizontal travel after 10 pixels is released
   to scrolling, and SHALL NOT be re-claimed for the remainder of that touch.
3. A gesture inside a row that declares itself swipeable belongs to that row.
4. Any remaining horizontal gesture is unclaimed. No gesture owns the screen at large.

No region of the screen SHALL be reserved for a navigation gesture. Navigation is a bottom
bar and has no gesture of its own, so a horizontal touch anywhere on screen belongs to the
surface under the finger.

The shared engine SHALL remain the single definition of this order even while only one
consumer exists, so a future horizontal gesture declares what it refuses rather than adding
a competing set of listeners.

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

A horizontal gesture SHALL follow the finger while it is in progress, SHALL commit when
travel passes its threshold fraction of the surface width or when release velocity passes
its threshold, and SHALL animate back to its starting position otherwise. A gesture SHALL
NOT commit on release alone.

#### Scenario: Short slow drag springs back

- **WHEN** a gesture is released below both its distance and velocity thresholds
- **THEN** the surface animates back to where it started and nothing changes

#### Scenario: Fast flick commits

- **WHEN** a gesture is released above its velocity threshold but below its distance threshold
- **THEN** it commits

#### Scenario: Content tracks the finger

- **WHEN** a gesture is in progress
- **THEN** the affected surface moves with the finger rather than waiting for release

### Requirement: A paired device row reveals its destructive action by swipe on touch

On a coarse pointer, a paired device row SHALL reveal its remove action by horizontal swipe
instead of showing a destructive button in the row, because a thumb aiming at rename should
not be able to land on a destructive control beside it. On a fine pointer the destructive
button SHALL remain: a mouse hits a small target precisely, and a drag gesture is not
available there, so removing must not become unreachable.

Rename SHALL remain an always-visible control in the row on both, because one revealed
action per row is easier to discover than two and rename is the reversible one. What removal
then does — confirm, then revoke trust — belongs to `device-management`.

#### Scenario: Swipe reveals remove on touch

- **WHEN** the user swipes a paired device row on a coarse-pointer device
- **THEN** a remove action is revealed for that row

#### Scenario: No destructive button beside rename on touch

- **WHEN** a paired device row renders on a coarse-pointer device
- **THEN** it shows no destructive control adjacent to rename

#### Scenario: Removal stays reachable with a mouse

- **WHEN** a paired device row renders on a fine-pointer device
- **THEN** the destructive control is present and removal does not depend on a gesture

#### Scenario: Rename stays visible in the row

- **WHEN** a paired device row renders on either pointer type
- **THEN** its rename control is visible without any gesture

### Requirement: The device list refreshes by pull

The paired-device list SHALL reload by a downward pull gesture. The gesture SHALL only start
when the list is already scrolled to the top, so it cannot interrupt scrolling, and SHALL
resist past a maximum pull distance rather than dragging without limit.

A downward drag from a resting top SHALL be claimed by the gesture rather than left to the
scroller's overscroll bounce, because a platform that has begun bouncing may abandon the
touch and the pull would be lost. An upward drag SHALL scroll normally.

The progress indication SHALL remain visible long enough to be seen, even when the reload
itself completes within a frame, so a deliberate gesture is always acknowledged.

Refreshing SHALL reset the screen's transient state along with its data: a partially entered
code and any open inline rename SHALL be cleared. A pairing code currently on display SHALL
NOT be regenerated, because another device may be part-way through entering it.

#### Scenario: Pull at the top refreshes

- **WHEN** the device list is scrolled to the top and the user pulls down past the trigger
  distance
- **THEN** the list reloads from the trust store and a progress indication is shown while it does

#### Scenario: Pull mid-list scrolls

- **WHEN** the device list is scrolled away from the top and the user drags down
- **THEN** the list scrolls and no refresh starts

#### Scenario: The pull is not lost to the overscroll bounce

- **WHEN** the user drags down repeatedly from the top of the device list
- **THEN** every such drag runs the pull gesture, and none of them is swallowed by the scroller
  bouncing instead

#### Scenario: A fast reload is still announced

- **WHEN** the reload completes almost immediately
- **THEN** the progress indication is still visible for long enough to be seen

#### Scenario: Refreshing clears stale input

- **WHEN** the user has typed part of a code, or opened a rename, and then pulls to refresh
- **THEN** the field is cleared and the rename closes, while a pairing code on display is left
  untouched

#### Scenario: Short pull is abandoned

- **WHEN** the user pulls down below the trigger distance and releases
- **THEN** the list returns to rest and no reload happens

### Requirement: Touch feedback fires at the moments that carry meaning

On touch devices the app SHALL give haptic feedback at the moments where something was taken
from the user or handed to them, and nowhere else. Those moments are: a code copied, a file
removed from the send queue, a transfer finished, and an incoming offer answered. Feedback
intensity SHALL match the weight of the event, with completion distinct from an incidental
tap.

Changing destination SHALL NOT be one of those moments. Navigation is a tap on a bar item, a
click, or a shortcut rather than a gesture that could commit or spring back, and a tap that
merely moves between screens took nothing and handed over nothing.

#### Scenario: Transfer completion is felt

- **WHEN** a transfer finishes on a phone
- **THEN** a success-weight haptic fires once

#### Scenario: Copy and remove are light

- **WHEN** the user copies a code or removes a file from the queue on a phone
- **THEN** a light haptic fires once for each action

#### Scenario: Answering an offer is felt, accept more than decline

- **WHEN** the user accepts or declines an incoming transfer on a phone
- **THEN** a haptic fires, and accepting is the heavier of the two

#### Scenario: Changing destination is silent

- **WHEN** the user taps a bottom-bar item to change destination on a phone
- **THEN** no haptic fires

#### Scenario: Ordinary taps are silent

- **WHEN** the user taps a control that is not one of the listed moments
- **THEN** no haptic fires

### Requirement: Touch feedback never becomes a failure

Haptic feedback SHALL be a no-op on devices without a coarse pointer, and a failure to
produce it SHALL never surface to the user or interrupt the action that triggered it. A
missing plugin, a denied permission, or hardware without a vibrator SHALL be
indistinguishable from success as far as the app's behaviour is concerned.

#### Scenario: Desktop is silent and unaffected

- **WHEN** any of the listed moments occurs on a desktop
- **THEN** no haptic is attempted and the action completes normally

#### Scenario: Unavailable haptics do not break a transfer

- **WHEN** haptic feedback cannot be produced on a device
- **THEN** the transfer, copy, or removal completes normally, no error is shown, and no error is
  logged as a failure

### Requirement: Touch feedback is independent of reduced-motion

Haptic feedback SHALL NOT be suppressed by the `prefers-reduced-motion` setting. That
setting concerns visual and vestibular motion; haptic strength is controlled separately by
the operating system, which the platform already honours below the app.

#### Scenario: Reduced motion keeps haptics

- **WHEN** the user has reduced motion enabled and a transfer finishes on a phone
- **THEN** the haptic still fires while visual animation remains reduced

### Requirement: Progress motion follows the rate without overshooting

Transfer progress SHALL be interpolated so that a fluctuating byte rate reads as smooth
movement rather than mechanical stepping. The displayed percentage SHALL never exceed 100
and SHALL never move backwards, whatever the interpolation does internally.

#### Scenario: Fluctuating rate reads smoothly

- **WHEN** a transfer's rate rises and falls during a transfer
- **THEN** the progress bar and percentage move smoothly rather than jumping between values

#### Scenario: Progress never reads over 100

- **WHEN** progress reaches completion and the interpolation overshoots
- **THEN** the displayed percentage is clamped at 100 and the bar does not extend past full

#### Scenario: Progress is information, not decoration

- **WHEN** the user has reduced motion enabled
- **THEN** progress still animates between values, because the movement is the information

### Requirement: Destination changes are animated in the direction of travel

Moving between the Send and Receive destinations SHALL animate in the direction of travel,
so that moving forward through the destination list and back again read as movement in
opposite directions rather than as two identical swaps.

The direction SHALL be derived from the change in position within the shared destination
list, not from the control or gesture that caused it, so every route into the change
animates consistently: a bar tap, a sidebar click, a keyboard shortcut, and a programmatic
navigation from an accepted transfer all produce the same motion.

A surface waiting on data SHALL show placeholder shapes matching the content it is loading,
rather than an unplaced spinner.

#### Scenario: Destination change moves in the direction of travel

- **WHEN** the user moves from Send to Receive, by any means
- **THEN** the outgoing content leaves and the incoming content arrives in the direction that
  matches the change, and moving back reverses the direction

#### Scenario: Every route into the change agrees

- **WHEN** the user reaches a destination by tapping the bar, clicking the sidebar, pressing its
  shortcut, or being taken there by an accepted transfer
- **THEN** the animation direction is the same in every case, because it is derived from the
  destinations' positions rather than from the control used

#### Scenario: A loading list shows its shape

- **WHEN** a surface in the app loads a list of items
- **THEN** it shows placeholder rows resembling those items rather than a centred spinner

### Requirement: Decorative motion collapses under reduced-motion, informative motion does not

Looping and decorative animation SHALL stop or degrade to a plain fade when the user prefers
reduced motion. Animation that conveys state — progress, and a gesture tracking a finger —
SHALL continue. This applies to animation driven from script as well as from stylesheets.

#### Scenario: Looping decoration stops

- **WHEN** the user prefers reduced motion
- **THEN** looping and attention-seeking animation does not play, and entrance animation
  degrades to a fade

#### Scenario: Script-driven transitions honour the preference too

- **WHEN** the user prefers reduced motion and a panel changes state
- **THEN** script-driven transitions collapse to no movement while still running their enter and
  exit hooks, so nothing downstream has to branch

#### Scenario: A gesture still tracks the finger

- **WHEN** the user prefers reduced motion and drags a swipeable surface
- **THEN** the surface still follows the finger, because the movement is the interaction
