# transfer-panel-layout (delta)

## REMOVED Requirements

### Requirement: The Transfer screen dissolves its card chrome on mobile

**Reason**: Replaced by "The transfer surface is headerless and dissolves its chrome on
mobile". The card's own header — title, tint dot, status headline, and badge — moves to the
shared top bar (`app-shell`), and user tests showed the badge earns no attention, so the
promise that the desktop card header is unchanged can no longer stand.
**Migration**: Full-bleed behavior below `sm`, feature parity, and named chrome variants
carry over unchanged into the new requirement. The status headline's home is now the shared
heading's status slot; the badge and its label functions are deleted without replacement.

## ADDED Requirements

### Requirement: The transfer surface is headerless and dissolves its chrome on mobile

The transfer card SHALL render no header of its own at any width: no title row, no tint dot,
no status headline, and no badge. The screen's title, accent dot, and live status line SHALL
come from the shared top bar (see `app-shell`), and the large-transfer warning SHALL render
as that heading's trailing action. The status badge is removed without replacement: the
percent is carried by the progress display, the queue size by the file list, and the phase
by the status line.

Below the `sm` breakpoint the Send and Receive screens SHALL each present as one full-bleed
surface rather than a floating card inside padding: the card SHALL drop its border, shadow,
radius, background, and horizontal padding so it becomes the page, and the page SHALL supply
exactly one gutter and drop its max-width so content spans the available width. At `sm` and
above the card SHALL keep its box chrome (border, shadow, radius, background). Feature
parity SHALL be preserved at every width: every state, the action zone, and the file-drop
target remain.

The two chrome treatments SHALL be named variants of the card, selected by name, rather than
override classes applied at the call site, so neither treatment can partially drift. The page
gutter itself belongs to the shared page container (see `app-shell`), not to this screen.

#### Scenario: Mobile card is full-bleed

- **WHEN** either transfer screen renders below the `sm` breakpoint
- **THEN** the transfer surface spans the content width with no card border, shadow,
  radius, or horizontal card padding, with a single page gutter and no centered narrow column

#### Scenario: The card renders no header at any width

- **WHEN** either transfer screen renders at any width in any state
- **THEN** the card shows no title, dot, headline, or badge of its own, and the shared top
  bar above it carries the title and the live status

#### Scenario: No badge renders on the transfer screens

- **WHEN** either transfer screen renders in any state
- **THEN** no status badge is shown anywhere on the screen

#### Scenario: Desktop card keeps its box

- **WHEN** either transfer screen renders at `sm` width or above
- **THEN** the card retains its border, shadow, radius, and background, with the content and
  action zones unchanged

#### Scenario: Chrome is selected by name

- **WHEN** the transfer card renders in either treatment
- **THEN** the treatment is chosen through a named variant of the card, and no call site
  applies chrome-removal classes of its own

#### Scenario: Full-bleed width triggers the roomy panel layouts

- **WHEN** the mobile card is full-bleed and its content width crosses the panels'
  container-query breakpoints
- **THEN** the Send and Receive panels render their regular (roomy) layouts, as already
  defined by the container-query requirement, without any mobile-specific panel code

#### Scenario: Feature parity holds on mobile

- **WHEN** either transfer screen is used on a phone
- **THEN** every transfer state, the anchored action zone, and the file-drop target behave
  exactly as on desktop
