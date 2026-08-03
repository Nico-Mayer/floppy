## ADDED Requirements

### Requirement: A device transfer's pre-transfer screen is one view that spans the wait and the answer

For a trusted-device target, everything before bytes move SHALL be one view that stays mounted from
the moment the transfer is arranged until progress replaces it. The answer arriving SHALL NOT swap the
screen: the view SHALL keep its position and size, its entrance animation SHALL NOT replay, and only
the mark and the label SHALL change.

This is a structural requirement, not a styling one. Panels SHALL NOT render this view from two
sibling branches keyed on the transfer status, because that destroys and recreates it on the
transition and replays every entrance animation inside it.

Establishing the connection and moving the bytes stay two screens: the view SHALL hand off to the
progress display at the first progress report, and SHALL NOT carry a gauge, a percentage, or a byte
figure itself.

A code target keeps its own screens (getting files ready, then the code) and SHALL NOT be folded into
this view: there is no device to name until someone brings the code.

#### Scenario: The answer does not swap the screen

- **WHEN** a trusted send is waiting on an answer and the other device accepts
- **THEN** the same view stays on screen with its layout unchanged, its entrance animation does not
  replay, and the only things that change are the mark and the label

#### Scenario: Progress takes over

- **WHEN** the first progress report arrives for a device transfer
- **THEN** the connecting view is replaced by the progress display, and no gauge or byte figure ever
  appeared in the connecting view

#### Scenario: A code send keeps its own screens

- **WHEN** a send is aimed at the code target
- **THEN** it shows the getting-ready screen and then the code screen, and never the device connecting
  view

### Requirement: The connecting view's mark carries the state and its label names the device

The connecting view SHALL be a single mark above a single label, and nothing else. There SHALL NOT be
a device illustration, a second heading, or explanatory sentences about what the other device has to
do: the mark says which state the transfer is in and the label says who it is with.

The mark SHALL be the shared spinner while the transfer is still being arranged, and SHALL become a
check the moment the other device says yes. Both SHALL sit in the same fixed frame the completion
screen's mark uses, so the swap changes no dimension on the screen, and the check SHALL arrive with
the app's existing entrance pop rather than a new animation.

The label SHALL be one short line that names the other device and nothing more, in the app's ordinary
voice: waiting on that device while the answer is outstanding, connecting to it once the answer has
come. It SHALL NOT restate what the mark already shows and SHALL NOT explain the pairing model.

The view SHALL NOT show a code, a QR, or any other copyable value: a device transfer is derived from
the pairing keys, so there is nothing here for a person to read out.

A receive has no answer to wait on, so its mark SHALL stay the spinner for the whole view. The check
means an answer arrived, and inventing one for a transfer that was already accepted would make the
mark say something that did not happen.

#### Scenario: Waiting on a yes

- **WHEN** a trusted send is waiting for the other device to answer
- **THEN** the view shows the spinner above one line naming that device, with no device illustration
  and no sentence explaining that the device has to accept

#### Scenario: The mark becomes a check

- **WHEN** the other device accepts a trusted send
- **THEN** the spinner is replaced in place by a check that enters with the app's entrance pop, the
  label changes to name connecting to that device, and no dimension on the screen changes

#### Scenario: A receive shows one waiting mark

- **WHEN** the connecting view renders for an accepted incoming transfer
- **THEN** the mark is the spinner and stays the spinner until progress replaces the view

#### Scenario: No code on a device transfer

- **WHEN** the connecting view renders for either direction
- **THEN** no code, QR, or copyable value appears on it

### Requirement: A send waiting too long on a yes says so

A trusted send waits on the other device's answer with nothing else on screen to explain a silence, so
after a fixed delay the view SHALL add one quiet line with the one thing to check, in the app's
ordinary voice. The label above it SHALL keep naming the device, so the added line is the only change.

The line SHALL be dropped the moment the answer arrives. A receive SHALL NOT show it: nothing there is
waiting on a yes.

#### Scenario: A silent wait is explained

- **WHEN** a trusted send has waited past the delay without an answer
- **THEN** one quiet line appears beneath the label with the one thing to check, and the mark and the
  label above it are unchanged

#### Scenario: A prompt answer never shows the hint

- **WHEN** the other device accepts before the delay elapses
- **THEN** the hint never appears and the view moves straight to the connecting mark and label

#### Scenario: A late answer clears the hint

- **WHEN** the other device accepts after the hint has appeared
- **THEN** the hint is removed as the mark becomes a check

#### Scenario: A receive has no such hint

- **WHEN** the connecting view renders for an accepted incoming transfer, however long it takes
- **THEN** no waiting-on-a-yes hint appears
