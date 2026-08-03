# interaction

## Purpose

How the app responds to a finger and to a pointer: hit-area minimums and where they come
from, one arbitration order for horizontal gestures, the swipe and pull gestures built on
it, the two non-visual feedback channels at the moments that carry meaning (haptics on a
touch device, and sound on every device), and which motion survives a reduced-motion
preference.

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
from the user, handed to them, or arrived for them, and nowhere else. Feedback intensity
SHALL match the weight of the event, with completion and failure distinct from an incidental
tap.

The moments the user causes with their own finger:

- a code copied (light)
- a file removed from the send queue (light)
- a QR code read by the scanner (medium)
- an incoming offer answered (accept medium, decline light — accepting is heavier because
  more happened)
- a pull-to-refresh crossing its trigger distance (light), so the finger knows release
  will commit before it lets go

The moments that arrive from elsewhere:

- an incoming transfer offer or a pairing confirm request appearing (warning weight, the
  "something arrived for you" note)
- the other device accepting a trusted send (medium — the wait is over)
- a transfer finishing, in either direction (success weight)
- a pairing completing (success weight, the same note as a finished transfer)
- a transfer failing mid-flight, a pairing failing, or the other device declining (error
  weight, one note for all failures)

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

#### Scenario: An arriving offer is felt

- **WHEN** an incoming transfer offer or a pairing confirm request appears while the app is
  visible on a phone
- **THEN** a warning-weight haptic fires once

#### Scenario: A failure is felt

- **WHEN** a transfer fails mid-flight, a pairing attempt fails, or the other device
  declines, while the app is visible on a phone
- **THEN** an error-weight haptic fires once

#### Scenario: The other device saying yes is felt

- **WHEN** a trusted send the user is waiting on is accepted by the other device, while the
  app is visible on a phone
- **THEN** a medium haptic fires once

#### Scenario: Pairing completion is felt

- **WHEN** a pairing completes on a phone with the app visible
- **THEN** a success-weight haptic fires once

#### Scenario: The pull trigger is felt

- **WHEN** a pull-to-refresh gesture crosses its trigger distance on a phone
- **THEN** a light haptic fires once, and crossing back and forth within the same touch does
  not fire it again

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

### Requirement: Event-driven feedback fires only in the foreground

A haptic moment driven by a backend event rather than by the user's own tap SHALL fire only
while the app is visible in the foreground. When the app is backgrounded, the OS
notification for that event carries the alert, and the operating system already applies its
own sound and vibration settings to it; the app SHALL NOT add a second buzz for the same
event.

Haptics caused directly by the user's finger need no such gate: the finger is on the screen,
so the app is foreground by construction.

#### Scenario: A background arrival does not buzz twice

- **WHEN** an incoming offer arrives while the app is in the background on a phone
- **THEN** the app fires no haptic of its own, and the OS notification alerts by the
  system's own settings

#### Scenario: A foreground arrival is felt without a notification

- **WHEN** an incoming offer arrives while the app is visible on a phone
- **THEN** the arrival haptic fires and no OS notification is shown, matching the existing
  foreground notification suppression

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

### Requirement: A paired device row's actions are visible buttons on every pointer type

Rename and remove SHALL both be visible controls in a paired device row, on a coarse pointer and a
fine one alike, reachable without a gesture and without a hover.

Because they sit next to each other, both SHALL meet the minimum by growing rather than by hit
slop, so neither one's hit area extends over the other's visible box. A person aiming at rename
must be able to see that they are not aiming at remove.

What protects an accidental press is the confirmation, not the control's obscurity: removal SHALL
still ask before trust is revoked, which `device-management` requires however the action is
reached.

#### Scenario: Both actions are present on touch

- **WHEN** a paired device row renders on a coarse-pointer device
- **THEN** rename and remove are both visible controls, and neither needs a gesture to reach

#### Scenario: Adjacent actions both grow

- **WHEN** a paired device row renders on a coarse-pointer device
- **THEN** both controls measure at least 44 CSS pixels in each dimension, and neither relies on hit
  slop over its neighbour

#### Scenario: An accidental press is still recoverable

- **WHEN** the user presses remove
- **THEN** a confirmation appears and trust is revoked only once it is confirmed

### Requirement: State-change motion comes from one vocabulary

Every animated state change in the app — a panel changing state, an overlay opening or
closing, a list row arriving or leaving, an error appearing — SHALL take its duration and
easing from the shared motion module or the shared keyframes, not from values written at the
call site. A feature component SHALL NOT carry its own hard-coded animation duration.

The vocabulary SHALL stay small and named: an entrance, an attention pop, an error shake,
and an arrival, each defined once. A new animated moment SHALL reuse one of them or extend
the vocabulary, not inline its own timing.

#### Scenario: No hard-coded durations in feature components

- **WHEN** the feature components are searched for literal transition durations
- **THEN** none are found, and every transition reads its timing from the shared motion
  module or a shared keyframe

#### Scenario: The same kind of moment moves the same way

- **WHEN** two different screens animate the same kind of moment (two panel entrances, two
  errors appearing)
- **THEN** both use the same named treatment, with the same timing

### Requirement: A row that arrives because of the user is seen arriving

A list row that appears as the result of a user action — a device joining the paired list, a
file joining the send queue — SHALL enter with a shared arrival treatment: motion into
place plus a brief self-decaying highlight. A row that is merely part of an initial render
SHALL NOT use it; the treatment marks change, not existence.

Under reduced motion the movement SHALL collapse to a fade while the brief highlight
remains, because the highlight is the information.

#### Scenario: A caused row is marked

- **WHEN** a row is added to a visible list as the result of a user action
- **THEN** it enters with the arrival treatment and the highlight fades on its own

#### Scenario: Initial render is calm

- **WHEN** a list first renders with its existing items
- **THEN** no row carries the arrival treatment

#### Scenario: Reduced motion keeps the highlight

- **WHEN** the user prefers reduced motion and a caused row arrives
- **THEN** the movement is a fade and the brief highlight still marks the row

### Requirement: Sound feedback marks a flow finishing or a flow needing an answer

The app SHALL play a short tone at exactly three moments, using two tones between them. The
moments that make a sound SHALL be a strict subset of the moments that fire a haptic:

- a transfer finishing, in either direction (the done tone)
- a pairing completing (the done tone, the same note as a finished transfer)
- an incoming transfer offer or a pairing confirm request appearing (the alert tone)

The done tone SHALL be shared by the two completions rather than split, because both report the
same fact: the thing the user was waiting on has finished. The two tones SHALL be tellable apart
without looking at the screen.

Every moment the user causes with their own finger SHALL be silent: copying a code, removing a
file from the send queue, reading a QR code, accepting or declining an offer, crossing the
pull-to-refresh trigger, and changing destination. Those happen with a finger on the control and
eyes on the result, so a tone adds nothing, and unlike a haptic a whole room can hear it.

The other device accepting a trusted send SHALL be silent. It is a step inside a flow rather than
its outcome, and the completion tone follows it within seconds; two tones seconds apart read as a
malfunction rather than as two facts.

#### Scenario: Transfer completion is heard

- **WHEN** a transfer finishes with the app focused
- **THEN** the done tone plays once

#### Scenario: Pairing completion is heard, with the same note

- **WHEN** a pairing completes with the app focused
- **THEN** the done tone plays once, and it is the same tone a finished transfer plays

#### Scenario: An arriving offer is heard, and is distinct from completion

- **WHEN** an incoming transfer offer or a pairing confirm request appears with the app focused
- **THEN** the alert tone plays once, and it is audibly different from the done tone

#### Scenario: Finger-driven moments are silent

- **WHEN** the user copies a code, removes a file from the queue, scans a QR code, accepts or
  declines an offer, crosses the pull-to-refresh trigger, or changes destination
- **THEN** no tone plays, and the haptic for that moment still fires on a touch device

#### Scenario: The other device saying yes is silent

- **WHEN** a trusted send the user is waiting on is accepted by the other device
- **THEN** no tone plays, the medium haptic still fires on a touch device, and the done tone
  plays only when the transfer itself finishes

#### Scenario: Ordinary taps are silent

- **WHEN** the user taps a control that is not one of the listed moments
- **THEN** no tone plays

### Requirement: Sound feedback never carries bad news

No failure SHALL make a sound. A transfer failing mid-flight, a pairing failing, and the other
device declining SHALL all be silent, even though each fires an error-weight haptic and each
shows on screen.

This asymmetry is deliberate. A failure raises no OS notification, and a tone only plays while
the window is focused, so a failure tone could only ever reach someone who already had the error
in front of them. An unpleasant noise adds nothing there, and it is the worst thing to hand
someone who has no way to switch it off. Failures are shown, not sounded.

#### Scenario: A failed transfer is silent

- **WHEN** a transfer fails mid-flight with the app focused
- **THEN** no tone plays, the error-weight haptic still fires on a touch device, and the failure
  is shown on screen as it is today

#### Scenario: A failed pairing is silent

- **WHEN** a pairing attempt fails with the app focused
- **THEN** no tone plays and the failure is shown on screen as it is today

#### Scenario: A decline is silent

- **WHEN** the other device declines a trusted send with the app focused
- **THEN** no tone plays and the decline is shown on screen as it is today

### Requirement: Tones are quiet and short, because there is no way to turn them off

The app SHALL NOT offer a control that disables sound feedback. Restraint SHALL take the place of
that control: the moment list above is deliberately short, and every tone SHALL be quiet and
brief enough to stay pleasant on repeat, in a shared room, for someone who cannot switch it off.

Each tone SHALL last under a quarter of a second end to end, SHALL play well below full scale
rather than at a level that carries across a room, and SHALL rise and fall through a smooth
amplitude envelope so that no note begins or ends with an audible click. No tone SHALL be
harsh, dissonant, or alarming.

Any future addition to the moment list SHALL be justified against the same reasoning the list
was built from, and SHALL NOT be a failure.

#### Scenario: No sound setting exists

- **WHEN** the user looks through the app's settings for a way to turn sound off
- **THEN** no such control exists, and the app relies on the platform's own volume and silencing
  controls instead

#### Scenario: Tones are brief

- **WHEN** either tone plays
- **THEN** it finishes within a quarter of a second

#### Scenario: Tones do not click

- **WHEN** any tone plays
- **THEN** no note starts or ends with an audible click or pop

#### Scenario: Repetition stays tolerable

- **WHEN** a person completes many transfers in a row within earshot of others
- **THEN** the tones remain unobtrusive at the app's own level, without anyone needing to reach
  for a volume control

### Requirement: Sound feedback runs on every device, not only touch devices

Sound feedback SHALL NOT be gated on pointer type. Haptics are a no-op on a fine pointer because
a mouse has nothing to feel them with; a desktop has speakers, and a desktop is the case with no
other non-visual channel at all. On a touch device the tone and the haptic for the same moment
SHALL both fire, as one event reported through two channels.

#### Scenario: Desktop hears what it cannot feel

- **WHEN** a transfer finishes on a desktop with the window focused
- **THEN** the done tone plays, even though no haptic is attempted

#### Scenario: A phone both feels and hears

- **WHEN** a transfer finishes on a phone with the app in front
- **THEN** the success-weight haptic fires once and the done tone plays once

### Requirement: Sound feedback is gated on window focus, not page visibility

A tone SHALL play only while the app window has focus. Where the app is not focused, the OS
notification for the same event carries the alert with the system's own sound settings, and the
app SHALL NOT add a second sound for one event.

This gate SHALL be window focus rather than page visibility. A desktop window that is visible
but behind another window reports itself visible while the core treats it as background and
raises a notification, so a visibility gate would let both sound at once. The focus gate is the
webview's view of the same predicate the core's notification gate reads.

#### Scenario: An unfocused desktop window does not sound twice

- **WHEN** a transfer finishes while the app window is visible on screen but not focused
- **THEN** the app plays no tone of its own, and the OS notification alerts by the system's own
  settings

#### Scenario: A backgrounded phone does not sound twice

- **WHEN** an incoming offer arrives while the app is in the background on a phone
- **THEN** the app plays no tone of its own, and the OS notification alerts by the system's own
  settings

#### Scenario: A focused window sounds and shows no notification

- **WHEN** an incoming offer arrives while the app window is focused
- **THEN** the alert tone plays and no OS notification is shown, matching the existing foreground
  notification suppression

### Requirement: Sound feedback sits under the platform's own mute and never overrides it

Where the operating system provides a control that silences app audio, sound feedback SHALL be
subject to it, and the app SHALL NOT take any step to escape it. Tones SHALL be produced in a
mixable, ambient audio mode: one that plays alongside whatever else is making sound rather than
pausing, ducking, or taking the audio session from it, and one that the platform's own silencing
control applies to.

The app SHALL NOT use the technique of holding an inaudible media element open to promote the
audio session to a playback mode. That would let a tone sound through a switch the user
deliberately flipped, and would make the app duck other audio.

Where the platform offers no such control, the platform's media volume SHALL be the only control,
and no substitute SHALL be invented.

#### Scenario: A silenced phone plays no tone

- **WHEN** the device's hardware silencing control is engaged and a transfer finishes with the
  app in front
- **THEN** no tone is heard, while the haptic still fires and the completed state still shows

#### Scenario: A tone does not interrupt what the user is listening to

- **WHEN** audio is playing from another app and any of the listed moments occurs with the app in
  front
- **THEN** the other app's audio keeps playing without being paused, and is not ducked

#### Scenario: Notification mute settings govern the notification, not the tone

- **WHEN** the user has silenced the app's notifications through a focus mode or a per-app
  notification sound setting, and a transfer finishes with the window focused
- **THEN** the tone plays, because no OS notification is raised for a focused window and the two
  never sound for the same event

### Requirement: Sound feedback is independent of reduced-motion

Sound feedback SHALL NOT be suppressed by the `prefers-reduced-motion` setting. That setting
concerns visual and vestibular motion and says nothing about hearing.

#### Scenario: Reduced motion keeps sound

- **WHEN** the user has reduced motion enabled and a transfer finishes with the window focused
- **THEN** the done tone still plays while visual animation remains reduced

### Requirement: Sound feedback never becomes a failure

A failure to produce a tone SHALL never surface to the user, never be reported as an error, and
never interrupt the action that asked for it. A webview that blocks playback until a user
gesture, a machine with no audio output, a muted output device, and an audio subsystem that
refuses to start SHALL all be indistinguishable from success as far as the app's behaviour is
concerned.

Because every moment that plays a tone is driven by a backend event rather than by a tap,
playback SHALL be prepared on the user's first interaction of the session so a later
event-driven tone is not refused for want of a gesture. That preparation SHALL happen once, SHALL
be silent, and SHALL itself never surface a failure.

#### Scenario: Blocked playback does not break a transfer

- **WHEN** the webview refuses to play a tone for any reason
- **THEN** the transfer, pairing, or arrival completes and displays normally, no error is shown,
  and nothing is logged as a failure

#### Scenario: The first event-driven tone is not swallowed

- **WHEN** the user has interacted with the app at least once and a transfer then finishes with
  the window focused
- **THEN** the done tone plays, rather than being refused for want of a user gesture

#### Scenario: Preparation is inaudible

- **WHEN** the user's first interaction of the session is an ordinary tap or keypress
- **THEN** nothing is heard from it

