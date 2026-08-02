## MODIFIED Requirements

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
