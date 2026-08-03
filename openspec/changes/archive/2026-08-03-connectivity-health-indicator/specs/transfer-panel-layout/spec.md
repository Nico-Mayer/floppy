# transfer-panel-layout

## ADDED Requirements

### Requirement: The Send and Receive top bar warns when a connection is missing

The Send and the Receive top bar SHALL show a connection warning when either link the app
depends on is down, and SHALL show nothing at all when both are up or not yet known. The
warning SHALL be a single quiet icon at the trailing edge of the title row, in a warning
tint, carrying an accessible name and a disclosure that reveals one short line naming what is
wrong and the one thing to try.

The warning SHALL NOT occupy vertical room of its own: it renders in the row the heading
already reserves, so the bar's height is identical warning or no warning, and content below
does not shift when a link changes state.

The warning SHALL be the same component on both screens, so its icon, tint, wording, and
disclosure cannot drift between them. Both screens SHALL read one shared source of link
state rather than each tracking its own.

Where a transfer screen already has something at the trailing edge, the connection warning
SHALL render leading of it, because a missing connection outranks any advice about the
transfer itself. Neither indication SHALL be hidden to make room for the other.

The warning SHALL NOT disable any control on the screen, and SHALL NOT replace or suppress a
transfer error surface: a failure that happens anyway still reports where failures report.

#### Scenario: A healthy app shows nothing

- **WHEN** Send or Receive is open and both links are up
- **THEN** no connection warning is rendered anywhere in the bar

#### Scenario: A launching app shows nothing

- **WHEN** Send or Receive is open and a link's state is not yet known
- **THEN** no connection warning is rendered, and none flashes on the way to a known state

#### Scenario: A down link warns in the bar

- **WHEN** either link is down while Send or Receive is open
- **THEN** a warning icon appears at the trailing edge of the title row, and revealing it
  shows one line naming what is wrong and what to try

#### Scenario: The two screens warn identically

- **WHEN** the same link is down and Send and Receive are compared
- **THEN** both render the same warning, from the same component, with the same wording

#### Scenario: The bar does not resize or reflow

- **WHEN** a link goes down and then comes back while a transfer screen is open
- **THEN** the bar's height is unchanged throughout and nothing below it moves

#### Scenario: Both trailing indications coexist on Send

- **WHEN** Send is idle with a big selection and a link is down
- **THEN** both the connection warning and the big-transfer warning are visible, the
  connection warning leading, and neither is dropped

#### Scenario: A warning blocks nothing

- **WHEN** a link is down on Send with files selected
- **THEN** the send can still be started, and the controls are not disabled

#### Scenario: A warning is not an error surface

- **WHEN** a transfer fails while a connection warning is showing
- **THEN** the failure is reported in the screen's existing error surface, and the warning
  neither replaces it nor is replaced by it
