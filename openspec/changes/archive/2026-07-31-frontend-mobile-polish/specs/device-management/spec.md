## MODIFIED Requirements

### Requirement: Dedicated Devices page

The app SHALL provide a dedicated Devices page reachable from top-level navigation
(not nested inside Settings). The page SHALL show this device's editable self-name
at the top, the list of paired devices below (each with its shown label), and a way
to add a device. Removing a device from the list SHALL revoke local trust so that
device can no longer send without a code.

On a coarse pointer, removal SHALL be reached by swiping the device's row rather than by a
destructive control sitting beside rename, so a thumb cannot hit the destructive action while
aiming for the reversible one. On a fine pointer the destructive control SHALL remain, since a
mouse aims precisely and has no drag gesture available, and removal must not become unreachable.
Rename SHALL remain a control in the row on both. Removal SHALL still require the existing
confirmation before trust is revoked.

#### Scenario: Devices page is its own destination

- **WHEN** the user opens the app navigation
- **THEN** Devices is a top-level entry, separate from Settings

#### Scenario: Self-name is editable from the page

- **WHEN** the user edits this device's self-name on the Devices page
- **THEN** the new name is saved and used for future pairings and transfers

#### Scenario: Remove revokes trust

- **WHEN** the user removes a paired device from the list
- **THEN** that device is no longer trusted and a code-free send from it is refused

#### Scenario: Removal is reached by swipe on touch

- **WHEN** a paired device row renders on a coarse-pointer device
- **THEN** it shows rename but no destructive control, and the remove action is revealed by
  swiping the row

#### Scenario: Removal keeps its button with a mouse

- **WHEN** a paired device row renders on a fine-pointer device
- **THEN** the destructive control is present beside rename, as before

#### Scenario: Removal still confirms before revoking

- **WHEN** the user activates the revealed remove action
- **THEN** the existing confirmation appears, and trust is revoked only once it is confirmed

### Requirement: Local rename of a paired device

The user SHALL be able to rename a paired device on the Devices page. A rename SHALL
be a local override that always wins over the peer's advertised self-name and SHALL
never be sent to the peer. Clearing the override SHALL let the device fall back to
the peer's advertised self-name.

The rename control SHALL stay in the device's row and SHALL NOT be moved behind the swipe
gesture: one revealed action per row is easier to discover than two, and rename is the
reversible one, so it keeps the always-visible affordance.

#### Scenario: Rename overrides the advertised name

- **WHEN** the user renames a paired device locally
- **THEN** the list shows the local name even after the peer advertises a different self-name

#### Scenario: Rename is not shared

- **WHEN** a device is renamed locally
- **THEN** the peer's own list is unaffected

#### Scenario: Rename stays visible in the row

- **WHEN** a paired device row renders
- **THEN** its rename control is visible without any gesture
