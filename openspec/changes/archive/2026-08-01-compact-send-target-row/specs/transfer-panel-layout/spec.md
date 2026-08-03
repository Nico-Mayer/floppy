## ADDED Requirements

### Requirement: The Send idle action zone is a single row

While the Send panel is idle with files queued, its anchored action zone SHALL occupy
one row: the send target on the left, taking the leftover width, and the Send button
on the right at its content width. There SHALL NOT be a separate visible field label
for the target, and the target SHALL NOT occupy a row of its own above the button. The
target's accessible name SHALL be preserved even though the visible label is gone.

The target control SHALL truncate a long label rather than growing the row or pushing
the Send button out of the card.

The row SHALL NOT change the anchored position of the action zone: Send sits where
Cancel and "Send more files" sit in the other states.

#### Scenario: Target and Send share one line

- **WHEN** the Send panel is idle with at least one file queued
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

### Requirement: The send target picker uses the platform's native picker on coarse pointers

On a coarse pointer the send target SHALL be chosen through the platform's native
select control, so the option list is drawn and dismissed by the operating system. On
a fine pointer it SHALL remain the styled listbox. Both SHALL offer the same options
in the same order — the code target first, then the trusted devices — SHALL group them
under the same headings, and SHALL write to the same bound value, so the choice made
in either control is indistinguishable to the rest of the send flow.

Switching between the two controls SHALL NOT lose or change the current selection.

#### Scenario: Coarse pointer gets the native control

- **WHEN** the user opens the send target picker on a coarse-pointer device
- **THEN** the choice is presented by the platform's own picker, listing the code
  target and every trusted device under their group headings

#### Scenario: Fine pointer keeps the styled listbox

- **WHEN** the user opens the send target picker with a mouse
- **THEN** the styled listbox opens, with its icons, group headings, and separator
  unchanged

#### Scenario: The selection survives a pointer change

- **WHEN** a target is chosen and the pointer type then changes, swapping which
  control renders
- **THEN** the same target is still selected and sending is unaffected

#### Scenario: The chosen device disappearing still falls back to the code target

- **WHEN** the selected device is removed from the trusted list while the picker shows
  it, in either control
- **THEN** the picker shows the code target and a send dispatches as a code send
