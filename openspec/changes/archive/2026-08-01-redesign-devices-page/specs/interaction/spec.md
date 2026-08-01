## REMOVED Requirements

### Requirement: A paired device row reveals its destructive action by swipe on touch

**Reason**: The gesture was worse in practice than the problem it solved. It is undiscoverable
without a hint, it competes with the list's own scrolling, and it left the destructive action a
drag plus a tap away on the pointer type that has the most trouble with both. The thumb hazard it
existed to prevent is answered by size and by the confirmation instead.

**Migration**: Remove is a visible button in the row on every pointer type, sized so a thumb can
see what it is hitting, and removal still confirms before trust is revoked. The gesture engine
(`horizontalSwipe`) stays as the definition of the horizontal-swipe arbitration order for the next
gesture that needs it; the row wrapper built on it is gone.

## ADDED Requirements

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
