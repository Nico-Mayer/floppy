## MODIFIED Requirements

### Requirement: Page headings come from one shared pattern

A route that shows a title and description SHALL render them through one shared heading
component, so wording, sizing, and spacing cannot drift between pages. A route whose content
carries its own title SHALL be able to omit the heading entirely.

The shared heading SHALL accept one action, placed on the title's own row at its trailing edge,
so a route can put a control there without hand-rolling a heading of its own. The title and its
preview marker SHALL stay together as one thing to read, with the action at the far end rather
than between them and the description. The heading SHALL own that control's placement and
spacing; a route SHALL only say what the control is. A route that passes nothing SHALL render
exactly as it does today.

A long title SHALL truncate rather than push the action off the row.

#### Scenario: Headings match across pages

- **WHEN** the titled routes are compared
- **THEN** their title and description sizing, weight, and spacing are identical

#### Scenario: A route without a heading is supported

- **WHEN** the transfer screen renders
- **THEN** it shows no page heading, because its card carries the title, and the shared
  container does not force one

#### Scenario: A heading can carry one action

- **WHEN** a route passes an action to the shared heading
- **THEN** it renders at the trailing edge of the title's row, spaced by the heading rather than by the route

#### Scenario: A long title does not displace the action

- **WHEN** a titled route's title is too long for the row
- **THEN** the title truncates and the action stays fully visible

#### Scenario: A heading without an action is unchanged

- **WHEN** a route passes no leading action
- **THEN** its heading renders exactly as it did before the slot existed
