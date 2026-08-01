## ADDED Requirements

### Requirement: Every route renders through one page shell

Every route SHALL render its content through one shared page container rather than assembling
its own. The container SHALL own the page gutters, the content width cap, and the scroll
region, and SHALL express the places routes genuinely differ as declared options rather than
letting each route invent its own values. A route SHALL NOT hand-write its gutters, its width
cap, or its scroll container.

Two gutter scales are permitted, and both SHALL be named options of the shared container: a
default scale for reading-width pages, and a tighter vertical scale for the transfer screen,
whose card fills the viewport height on a phone and cannot spare the room.

#### Scenario: Routes share one container

- **WHEN** any route renders
- **THEN** its gutters, width cap, and scroll region come from the shared page container

#### Scenario: Gutters are consistent within a scale

- **WHEN** the reading-width routes are compared to each other
- **THEN** their gutters and width caps are identical at every viewport size

#### Scenario: The transfer screen's tighter vertical is declared, not ad hoc

- **WHEN** the transfer screen renders on a phone
- **THEN** its tighter vertical gutter comes from a named option of the shared container, not
  from classes written on the route

#### Scenario: A new route inherits the shell

- **WHEN** a route is added using the shared container without layout classes of its own
- **THEN** its gutters, width, and scrolling already match its peers

### Requirement: Page headings come from one shared pattern

A route that shows a title and description SHALL render them through one shared heading
component, so wording, sizing, and spacing cannot drift between pages. A route whose content
carries its own title SHALL be able to omit the heading entirely.

#### Scenario: Headings match across pages

- **WHEN** the titled routes are compared
- **THEN** their title and description sizing, weight, and spacing are identical

#### Scenario: A route without a heading is supported

- **WHEN** the transfer screen renders
- **THEN** it shows no page heading, because its card carries the title, and the shared
  container does not force one

### Requirement: Scroll regions contain their own overscroll

Every scroll region inside the shell SHALL contain its overscroll, so reaching the end of a
list does not chain the scroll to the webview and rubber-band the whole app.

#### Scenario: Reaching the end of a list does not move the app

- **WHEN** the user scrolls a page's content to its end on a phone and keeps dragging
- **THEN** the list stops at its end and the surrounding app does not shift or rubber-band

### Requirement: The shell names the platform signals it branches on

The shell SHALL distinguish, by name, between pointer coarseness, viewport narrowness, and
platform form factor, and each branch in the app SHALL state which of the three it depends on.
These are separate questions and SHALL NOT be conflated behind a single "mobile" test.

Pointer coarseness governs hit areas, controls that cannot be revealed by hover, and whether
touch feedback fires. Viewport narrowness governs full-bleed content layout and whether a
transient surface is a centred dialog or a bottom drawer. Platform form factor governs the
mobile app bar versus the desktop titlebar, the mobile document flag, and hiding actions the
platform cannot perform.

The navigation's own threshold for collapsing to an icon rail SHALL remain separate and
separately named, because when a rail is worth the horizontal room is a different question from
when content should go full-bleed.

#### Scenario: Each branch names its signal

- **WHEN** a component branches on platform or viewport
- **THEN** it reads a named signal describing what it actually measures, not a general
  "is mobile" flag

#### Scenario: A narrow desktop window is coherent

- **WHEN** a desktop window is resized narrower than the content threshold
- **THEN** content goes full-bleed and transient surfaces become drawers, while the desktop
  titlebar and window controls remain, because form factor has not changed

#### Scenario: One definition per threshold

- **WHEN** two components need the same question answered
- **THEN** they read the same named signal, and no second definition of the same threshold
  exists in the codebase

#### Scenario: The rail threshold stays its own

- **WHEN** the navigation decides between a drawer and an icon rail
- **THEN** it uses its own named threshold, and changing the content threshold does not move
  where the rail appears
