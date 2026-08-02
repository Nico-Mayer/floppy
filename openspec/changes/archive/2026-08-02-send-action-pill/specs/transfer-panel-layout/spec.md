## MODIFIED Requirements

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
Cancel and "Send something else" sit in the other states.

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
