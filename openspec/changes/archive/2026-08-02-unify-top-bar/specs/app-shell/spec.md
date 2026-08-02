# app-shell (delta)

## REMOVED Requirements

### Requirement: Page headings come from one shared pattern

**Reason**: Replaced by "One top bar serves every destination". The allowance for a route to
skip the heading existed only because the transfer card carried its own title; that card
header is removed, so the allowance would leave the transfer screens with no title at all.
**Migration**: Every destination now renders the shared heading. The action slot, truncation,
and consistency rules carry over into the new requirement unchanged.

## ADDED Requirements

### Requirement: One top bar serves every destination

Every destination SHALL render its title through one shared heading component, so wording,
sizing, and spacing cannot drift between pages and there is a single place the top of a
screen is shaped. No destination SHALL render a second title of its own below it.

The heading SHALL accept, beyond the title and optional description: an optional accent dot
before the title, for a screen whose color identity matters (Send, Receive); an optional
status line on the title row, rendered quiet and mono, stating what is happening right now;
and one action at the title row's trailing edge, whose placement and spacing the heading
owns. A status change SHALL be announced politely to assistive technology. The title and its
preview marker SHALL stay together as one thing to read.

Below the `sm` breakpoint the heading SHALL be compact: a single row with a smaller title
scale, and the description not rendered. At `sm` and above the title and description SHALL
keep their current sizes. A long title SHALL truncate rather than push the status or the
action off the row.

The title row SHALL reserve the height an icon action occupies whether or not one is
passed, so a destination with a control in its heading stands no taller than one without,
and the bar's height never changes as the user moves between destinations or as an action
appears.

The heading SHALL sit at the same distance from the top of the content region on every
destination at any one width. A page container variant that trades vertical gutter for
content room SHALL take that room from below the content, not from above the heading.

#### Scenario: The bar does not move between destinations

- **WHEN** the user moves between any two destinations at the same width
- **THEN** the heading renders at the same vertical position on both

#### Scenario: Headings match across pages

- **WHEN** the destinations are compared at any one width
- **THEN** their title sizing, weight, and spacing are identical, all rendered by the one
  shared component

#### Scenario: The transfer screens use the same top bar

- **WHEN** Send or Receive renders in any state
- **THEN** its title, accent dot, and live status line are in the shared heading, and the
  content below renders no title of its own

#### Scenario: The phone bar is one compact row

- **WHEN** any destination renders below the `sm` breakpoint
- **THEN** the heading is a single row with the compact title scale and no description line

#### Scenario: The description returns with room

- **WHEN** the same destination renders at `sm` width or above
- **THEN** the description renders below the title at its current size

#### Scenario: A heading can carry one action

- **WHEN** a route passes an action to the shared heading
- **THEN** it renders at the trailing edge of the title's row, spaced by the heading rather
  than by the route

#### Scenario: A long title does not displace the status or the action

- **WHEN** a titled route's title is too long for the row
- **THEN** the title truncates and the status line and action stay fully visible

#### Scenario: The bar is the same height with and without an action

- **WHEN** a destination whose heading carries an action is compared with one whose heading
  does not, at the same width and pointer type
- **THEN** the two headings are the same height

#### Scenario: A status change is announced

- **WHEN** the status line's text changes while the screen is open
- **THEN** assistive technology announces the new status without stealing focus
