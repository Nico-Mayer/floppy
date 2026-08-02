# preview-markers

## Purpose

Be honest about what is not built yet: one declaration marks a destination or surface as a
preview, every placement of the marker reads from it, preview controls stay operable, and a
control that would state something false is removed rather than marked.
## Requirements
### Requirement: A screen whose controls do nothing yet says so

Any screen or dialog whose controls are laid out but not connected to the app SHALL carry a
visible preview marker, so nobody mistakes a placeholder for working software. The marker SHALL
identify itself on hover or focus with plain language saying the screen is a preview and is not
wired up yet.

#### Scenario: Preview screen is marked

- **WHEN** a screen whose controls are not connected renders
- **THEN** a preview marker appears next to its title

#### Scenario: Marker explains itself

- **WHEN** the user hovers or focuses the marker
- **THEN** plain text says the screen is a preview and its controls are not wired up yet

#### Scenario: Working screens carry no marker

- **WHEN** a screen whose controls are connected renders
- **THEN** it shows no preview marker

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

### Requirement: One declaration drives every placement of a marker

Whether a destination is a preview SHALL be declared once, in the shared destination list, and
every placement of the marker SHALL read from that declaration. A screen and its navigation
entry SHALL NOT be able to disagree about whether it is a preview.

#### Scenario: Flipping one declaration updates every placement

- **WHEN** a destination's preview declaration is removed
- **THEN** the marker disappears from both its page title and its navigation entry, with no
  other edit

#### Scenario: A non-route surface can still be marked

- **WHEN** a dialog that is not a destination is a preview
- **THEN** it can carry the same marker in its title

### Requirement: Preview controls stay interactive

Controls on a preview screen SHALL remain focusable and operable, so their states can be
reviewed. They SHALL NOT be disabled or dimmed as a way of signalling that they are previews:
the screen-level marker carries that meaning.

#### Scenario: A preview switch can be toggled

- **WHEN** the user toggles a switch on a preview screen
- **THEN** it moves and shows its other state, and nothing outside the screen changes

#### Scenario: Preview controls are reachable by keyboard

- **WHEN** the user tabs through a preview screen
- **THEN** every control receives focus in order

### Requirement: A control that would state something false is removed, not marked

A marker declares that a screen is unfinished; it does not make a wrong value acceptable. A
control that would display or imply a value contradicting actual app behaviour SHALL be removed
until it can show the truth. Placeholder text SHALL NOT imitate a real value, such as a
plausible hostname or a real filesystem path.

A value read from the app itself is the truth and may be shown: the settings screen SHALL show
the save location only as the real resolved destination root, never as a hardcoded or
imagined path.

#### Scenario: No control asserts a wrong destination

- **WHEN** the settings screen shows a save location
- **THEN** the value shown is the real destination root the app resolved, not a hardcoded
  path, and if the real value cannot be read no location is shown at all

#### Scenario: No control offers a choice that does not exist

- **WHEN** the settings screen renders
- **THEN** it offers no switch for per-transfer folders, because that behaviour is unconditional
  and the switch would imply it can be turned off

#### Scenario: Placeholders do not imitate real values

- **WHEN** a preview text field shows placeholder text
- **THEN** that text does not read as a real hostname, path, or account

### Requirement: No preview surface calls an external service

A preview surface SHALL NOT make a network request to a third-party service. The app's promise
is device to device with no cloud, and an unfinished screen is the worst possible reason to
break it.

#### Scenario: Signed-out account row makes no request

- **WHEN** the navigation renders while signed out
- **THEN** no request is made to any external avatar or profile service, and the local icon
  fallback is shown

### Requirement: A marker may stand for a planned feature, not only an unfinished screen

A preview marker SHALL be usable on a surface that advertises a feature the product intends to
build but has not built yet, so the entry point can stay in place while being honest that it
does not work. Such a surface SHALL remain reachable and SHALL NOT be removed merely because it
is unimplemented.

The surface MAY be smaller than a whole screen. Where a working choice and a planned one sit
side by side in the same menu or sheet, the marker SHALL be placed on the planned row itself
rather than on the container, so it cannot be read as covering the working row too. A row
carrying the marker SHALL stay focusable and tappable, like any other preview control, and
activating it SHALL change nothing.

A marked planned feature SHALL NOT be read as a change to any guarantee the product already
makes. In particular, the account sign-in entry point stands for planned app-level device sync
and SHALL NOT be taken to mean the rendezvous broker keeps accounts or persists state: the
broker's accountless, stateless contract is unaffected by anything on this surface.

#### Scenario: The account row stays and is marked

- **WHEN** the navigation renders while signed out
- **THEN** the sign-in entry point is present and carries a preview marker

#### Scenario: Opening a planned feature explains itself

- **WHEN** the user opens the sign-in surface
- **THEN** its title carries the preview marker, and the marker explains that the feature is
  planned and not working yet

#### Scenario: A planned feature makes no promise about the broker

- **WHEN** the sign-in surface describes what signing in would do
- **THEN** its wording covers device sync between installs only, and does not state or imply
  that the rendezvous broker holds accounts or stores state

#### Scenario: One planned row beside a working one

- **WHEN** a sheet offers a working choice and a planned choice as two rows
- **THEN** the marker sits on the planned row only, the sheet as a whole carries no marker,
  and the working row is offered without qualification

#### Scenario: A marked row is still operable

- **WHEN** the user focuses and activates a row carrying the preview marker
- **THEN** the row takes focus and responds to the tap, and nothing in the app changes

### Requirement: A partly real screen is marked per section

A screen that mixes connected sections with preview sections SHALL NOT be marked page-wide.
The preview marker SHALL sit on each unconnected section instead, so a marker never claims a
working control is a preview and a working section never lends credibility to a stub. A
destination whose screen has at least one connected section SHALL NOT carry the preview
marker in navigation.

#### Scenario: Only the stub sections are marked

- **WHEN** a screen renders with both connected and unconnected sections
- **THEN** each unconnected section carries the preview marker and the connected sections and
  the page title do not

#### Scenario: The navigation entry reads as connected

- **WHEN** a destination's screen has at least one connected section
- **THEN** its navigation entries carry no preview marker

