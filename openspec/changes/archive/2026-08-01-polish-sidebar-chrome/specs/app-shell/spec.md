# app-shell (delta)

## ADDED Requirements

### Requirement: The sidebar is bracketed by a brand row and an account row

The sidebar SHALL open with a brand row and close with an account row, and the two
SHALL share one visual shape: a square mark or avatar at the leading edge followed by
a two-line label. Both SHALL be built from the same sidebar menu-button size so that
neither hard-codes the geometry the icon rail depends on.

The brand row SHALL NOT be interactive. It carries no destination and performs no
action, so it SHALL NOT be focusable, SHALL NOT be announced as a control, and SHALL
NOT present hover or pressed feedback.

The brand mark SHALL be referenced from a single stable asset path so the artwork can
be replaced without editing markup.

#### Scenario: Brand and account rows match

- **WHEN** the sidebar is expanded on any platform
- **THEN** the brand row and the account row have the same height and the same
  mark-then-two-lines layout

#### Scenario: The brand row is inert

- **WHEN** the user tabs through the sidebar, or hovers and presses the brand row
- **THEN** focus skips it, no control is announced, and it shows no hover or pressed
  state

#### Scenario: The mark survives the icon rail

- **WHEN** the sidebar is collapsed to the icon rail
- **THEN** the brand mark remains visible at the same size as the account avatar and
  the brand text is hidden, with no clipped or partially rendered text

#### Scenario: Swapping the artwork touches no markup

- **WHEN** the brand image file is replaced at its established path
- **THEN** the sidebar renders the new artwork with no change to any component

### Requirement: The account row is separated from the destination list

A separator SHALL divide the destination list from the account row so the account row
reads as its own region rather than a further destination. The separator SHALL remain
visible when the sidebar is collapsed to the icon rail.

#### Scenario: Separator divides nav from account

- **WHEN** the sidebar is expanded
- **THEN** a horizontal rule sits between the last destination and the account row

#### Scenario: Separator survives the rail

- **WHEN** the sidebar is collapsed to the icon rail
- **THEN** the separator is still drawn between the destination icons and the account
  avatar

## MODIFIED Requirements

### Requirement: The shell respects safe areas on every platform

The shell SHALL keep content and chrome clear of the status bar, notch, home indicator,
and gesture rails using the per-edge safe-area tokens, resolving native Android insets
first and `env()` otherwise, and SHALL pad surfaces portaled onto `<body>` (sheets,
drawers, dialogs) clear of those areas.

A safe-area inset applied to a surface that already carries its own padding SHALL be
added to that padding rather than replacing it. On a platform where an inset resolves
to zero, the surface SHALL keep the spacing it would have had without any inset.

#### Scenario: Content clears the notch and home indicator

- **WHEN** the app runs on a device with a notch and a home indicator
- **THEN** the header clears the top inset and the drawer and bottom-anchored actions
  clear the bottom inset, with no content under the system bars

#### Scenario: A zero inset does not eat existing spacing

- **WHEN** the sidebar is shown on desktop, where the bottom safe-area inset is zero
- **THEN** the account row keeps its normal gap to the bottom edge of the window
  instead of sitting flush against it

#### Scenario: A real inset stacks on existing spacing

- **WHEN** the sidebar drawer is shown on a phone with a gesture bar
- **THEN** the account row clears the gesture bar and still keeps its normal gap above
  it
