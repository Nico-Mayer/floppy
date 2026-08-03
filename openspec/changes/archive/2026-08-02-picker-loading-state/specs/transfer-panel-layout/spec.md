## ADDED Requirements

### Requirement: The Send panel reports a picker call that is still in flight

From the moment the app asks the platform for a picker until the picker's result has been
resolved into queue entries, the Send panel SHALL report that it is working, whichever way the
pick was started — the empty state, the dashed add tile, or the floating add button — and for
either picker, files or photos.

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

While a pick is in flight the Send screen SHALL refuse to start a second one: the empty state,
the dashed add tile, and the floating add button each SHALL do nothing when activated. The
refusal itself SHALL be silent — no surface SHALL change size or grow an indicator of its own
because it was tapped, since the report is already on screen saying why nothing happened, and a
surface that resizes under a finger that has just tapped it is worse than one that waits. On the
empty shape the copy swap described above is the report, not a reaction to being tapped, and
happens whether the pick was started from that surface or another.

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

#### Scenario: The add tile and the add button do not change shape while picking

- **WHEN** a pick is in flight over a queue that already holds files
- **THEN** the dashed add tile and the floating add button keep their usual appearance and size,
  and neither shows an indicator of its own — the add tile in particular can be scrolled out of
  view, which is why the report is not on it

#### Scenario: The report claims no count and no progress

- **WHEN** the Send screen is reporting a pick after a large selection
- **THEN** no count of items, percentage, progress bar, or time estimate is shown

#### Scenario: The report is announced as one sentence

- **WHEN** the report appears
- **THEN** assistive technology announces what is being waited on, once, without a separate
  generic loading label beside it

#### Scenario: A second pick cannot be started while one is in flight

- **WHEN** a pick is in flight and the user activates the empty state, the dashed add tile, or
  the floating add button
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

### Requirement: The Send idle action zone is a single row

While the Send panel is idle with files queued, its anchored action zone SHALL occupy
one row: the send target on the left, taking the leftover width, and the Send button
on the right at its content width. There SHALL NOT be a separate visible field label
for the target, and the target SHALL NOT occupy a row of its own above the button. The
target's accessible name SHALL be preserved even though the visible label is gone.

This describes the idle zone when nothing is pending. While a picker call is in flight the
zone instead reports the wait and carries no send target and no Send button, so a send cannot
be started over a selection that has not finished arriving — see "The Send action zone reports
a picker call that is still in flight". The row returns unchanged when the pick resolves.

The target control SHALL truncate a long label rather than growing the row or pushing
the Send button out of the card.

The row SHALL NOT change the anchored position of the action zone: Send sits where
Cancel and "Send more files" sit in the other states.

#### Scenario: Target and Send share one line

- **WHEN** the Send panel is idle with at least one file queued and no pick in flight
- **THEN** the target control and the Send button render side by side on one line,
  with no visible "Send to" label above them and no third control between them

#### Scenario: A long device name does not break the row

- **WHEN** the chosen target is a device with a name longer than the available width
- **THEN** the name truncates inside the target control and the Send button stays
  fully visible at its usual size

#### Scenario: The action zone stays anchored across states

- **WHEN** the Send panel goes idle → starting → sending → done
- **THEN** the primary control in each state renders at the same anchored bottom
  position, unmoved by the idle row's new shape

#### Scenario: The compact card still fits the row

- **WHEN** the Send panel is idle with files queued in a card at the 500px minimum
  window width, or full-bleed on a phone
- **THEN** the row renders on one line with no horizontal overflow and no clipped
  control
