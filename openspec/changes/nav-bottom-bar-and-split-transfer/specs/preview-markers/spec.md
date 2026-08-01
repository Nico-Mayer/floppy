## MODIFIED Requirements

### Requirement: Preview state is visible before navigating

A destination that is a preview SHALL be marked in the navigation itself, so the state is known
before the user spends a tap on it. The navigation marker SHALL be quiet enough not to compete
with a destination's own badge.

This SHALL hold for every navigation surface the app renders. Both the bottom bar and the desktop
sidebar SHALL carry the marker, reading it from the same declaration, so a destination cannot
appear connected in one surface and a preview in the other.

Where a navigation surface has room only for an icon and a short label, the marker SHALL still be
placed without truncating the label or the destination's count.

#### Scenario: Navigation shows which destinations are previews

- **WHEN** the user views any navigation surface
- **THEN** each preview destination carries a marker, and connected destinations do not

#### Scenario: Both navigation surfaces agree

- **WHEN** the same destination is compared in the bottom bar and in the desktop sidebar
- **THEN** it is marked as a preview in both, or in neither

#### Scenario: Marker coexists with a count badge

- **WHEN** a destination has both a count badge and a preview marker
- **THEN** both are legible and neither is truncated

#### Scenario: Marker fits a bar item

- **WHEN** a preview destination renders as a bottom-bar item
- **THEN** the marker is visible alongside the item's icon and label without clipping either
