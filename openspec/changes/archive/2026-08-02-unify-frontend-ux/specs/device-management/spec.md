# device-management — delta

## ADDED Requirements

### Requirement: Device actions show they are working

Every asynchronous device action — accepting or declining an incoming pairing, confirming a
pairing, sending to a device, renaming, and removing — SHALL show in-flight state on the
control that started it, through the shared pending primitives, until the action settles.
The action SHALL NOT be startable a second time while it runs.

The pending state SHALL be held in the shared device state rather than in one component, so
a row, a dialog, and a panel that can each start the same action all reflect it, and the
state survives any one of them closing.

#### Scenario: Confirming a pairing shows it is working

- **WHEN** the user confirms an incoming pairing and the agreement takes noticeable time
- **THEN** the confirm control shows a pending indication and cannot be pressed again until
  the pairing settles

#### Scenario: A slow removal is visibly in flight

- **WHEN** the user confirms removing a device
- **THEN** the confirming control shows pending state until trust is revoked and the row
  leaves the list

#### Scenario: Two surfaces agree about one pending action

- **WHEN** an action started from one surface is still running and another surface that can
  start the same action is open
- **THEN** the other surface also shows that action as pending

### Requirement: A completed pairing is seen arriving

When a pairing completes, the new device's row SHALL arrive visibly: it SHALL enter the
paired list with the shared arrival treatment (motion plus a brief highlight that decays on
its own) rather than appearing between two frames. The existing behaviors around it are
unchanged: the pairing surface still closes itself, and the accepted haptic still fires.

No completion dialog and no success toast SHALL be added: the row is the result, and the
arrival treatment is what points the user at it.

#### Scenario: The new row announces itself

- **WHEN** a pairing completes while the Devices page is visible
- **THEN** the new row enters with the arrival treatment and its highlight fades on its own

#### Scenario: Arriving elsewhere still lands visibly

- **WHEN** a pairing completes while the user is on another screen
- **THEN** the next visit to the Devices page shows the device in the list, and no dialog or
  toast interrupted the screen the user was on

#### Scenario: Reduced motion still shows the arrival

- **WHEN** the user prefers reduced motion and a pairing completes on the Devices page
- **THEN** the row appears with the motion collapsed to a fade, and the brief highlight still
  identifies it
