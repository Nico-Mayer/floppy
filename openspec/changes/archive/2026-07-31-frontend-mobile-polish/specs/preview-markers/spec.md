## ADDED Requirements

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

#### Scenario: Navigation shows which destinations are previews

- **WHEN** the user opens the navigation
- **THEN** each preview destination carries a marker, and connected destinations do not

#### Scenario: Marker coexists with a count badge

- **WHEN** a destination has both a count badge and a preview marker
- **THEN** both are legible and neither is truncated

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

#### Scenario: No control asserts a wrong destination

- **WHEN** the settings screen renders
- **THEN** it shows no field claiming a save location, because the real location is resolved per
  platform and differs from any single value shown there

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
