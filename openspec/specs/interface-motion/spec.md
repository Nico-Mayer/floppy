# interface-motion Specification

## Purpose
TBD - created by archiving change frontend-mobile-polish. Update Purpose after archive.
## Requirements
### Requirement: Touch feedback fires at the moments that carry meaning

On touch devices the app SHALL give haptic feedback at the moments where something was taken
from the user or handed to them, and nowhere else. Those moments are: a code copied, a file
removed from the send queue, a transfer finished, and an incoming offer answered. Feedback
intensity SHALL match the weight of the event, with completion distinct from an incidental tap.

Changing destination SHALL NOT be one of those moments. Navigation is now a tap on a bar item, a
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

Haptic feedback SHALL be a no-op on devices without a coarse pointer, and a failure to produce
it SHALL never surface to the user or interrupt the action that triggered it. A missing plugin,
a denied permission, or hardware without a vibrator SHALL be indistinguishable from success as
far as the app's behaviour is concerned.

#### Scenario: Desktop is silent and unaffected

- **WHEN** any of the listed moments occurs on a desktop
- **THEN** no haptic is attempted and the action completes normally

#### Scenario: Unavailable haptics do not break a transfer

- **WHEN** haptic feedback cannot be produced on a device
- **THEN** the transfer, copy, or removal completes normally, no error is shown, and no error is
  logged as a failure

### Requirement: Touch feedback is independent of reduced-motion

Haptic feedback SHALL NOT be suppressed by the `prefers-reduced-motion` setting. That setting
concerns visual and vestibular motion; haptic strength is controlled separately by the operating
system, which the platform already honours below the app.

#### Scenario: Reduced motion keeps haptics

- **WHEN** the user has reduced motion enabled and a transfer finishes on a phone
- **THEN** the haptic still fires while visual animation remains reduced

### Requirement: Progress motion follows the rate without overshooting

Transfer progress SHALL be interpolated so that a fluctuating byte rate reads as smooth movement
rather than mechanical stepping. The displayed percentage SHALL never exceed 100 and SHALL never
move backwards, whatever the interpolation does internally.

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

Moving between the Send and Receive destinations SHALL animate in the direction of travel, so
that moving forward through the destination list and back again read as movement in opposite
directions rather than as two identical swaps.

The direction SHALL be derived from the change in position within the shared destination list,
not from the control or gesture that caused it, so every route into the change animates
consistently: a bar tap, a sidebar click, a keyboard shortcut, and a programmatic navigation from
an accepted transfer all produce the same motion.

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

