# app-shell Specification

## Purpose

TBD - created by archiving change unify-responsive-shell. Update Purpose after archive.
## Requirements
### Requirement: A single shell serves every platform and width

The application SHALL render one shell built on a single `Sidebar.Provider`. The layout
SHALL NOT fork its structure on `isMobile`. Platform (macOS / Windows / Linux / iOS /
Android) SHALL determine only the header chrome; available width SHALL determine only the
navigation presentation.

#### Scenario: Desktop and mobile share one shell tree

- **WHEN** the app mounts on any platform
- **THEN** it renders one `Sidebar.Provider` containing the header, the sidebar, and the
  routed content, with no separate mobile-only shell branch

#### Scenario: No bottom tab bar exists

- **WHEN** the app runs on a phone
- **THEN** navigation is the sidebar-as-drawer, and no fixed bottom tab bar is rendered

### Requirement: The header adapts its chrome to the platform

A single `AppHeader` SHALL provide per-platform chrome: on macOS a traffic-light spacer
and a window drag region, on Windows the min/maximize/close controls and a drag region,
on iOS/Android status-bar-safe padding and no window controls. The header SHALL show a
menu (hamburger) control whenever the sidebar is collapsible.

#### Scenario: macOS window is draggable and clears the traffic lights

- **WHEN** the app runs on macOS
- **THEN** the header reserves space for the native traffic lights and exposes a drag
  region, and no min/maximize/close buttons are drawn

#### Scenario: Windows renders custom window controls

- **WHEN** the app runs on Windows (frameless)
- **THEN** the header renders minimize, maximize, and close controls that operate the
  window

#### Scenario: Mobile header clears the status bar

- **WHEN** the app runs on iOS or Android
- **THEN** the header pads itself down by the top safe-area inset and renders no window
  controls

#### Scenario: Menu control appears only when the sidebar can collapse

- **WHEN** the sidebar is in a collapsible state (touch, narrow width, or desktop rail
  mode)
- **THEN** the header shows a menu control that toggles the sidebar

### Requirement: The desktop sidebar is a collapsible icon rail

On desktop at the wide breakpoint the sidebar SHALL be fixed and open by default and
SHALL collapse to an icon-only rail and back via the menu control. In rail mode item
labels and hints SHALL hide and only icons SHALL remain.

#### Scenario: Collapse to rail

- **WHEN** the user toggles the menu control on a wide desktop window
- **THEN** the sidebar collapses to an icon rail showing only destination icons, and the
  content area widens to fill the reclaimed space

#### Scenario: Expand from rail

- **WHEN** the user toggles the menu control while the sidebar is a rail
- **THEN** the sidebar expands to show icons with labels and hints

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

### Requirement: The shell has no in-app history-back

The shell SHALL NOT track navigation depth or render an in-app back control. Navigation
SHALL be flat: every destination stands on its own.

#### Scenario: No back control in the header

- **WHEN** the user navigates between any destinations
- **THEN** no back button appears in the header on any platform

#### Scenario: Android hardware-back dismisses overlays, else closes the app

- **WHEN** the Android hardware back button is pressed while an overlay (dialog, sheet, or
  the navigation drawer) is open
- **THEN** that overlay is dismissed and navigation does not change
- **WHEN** the Android hardware back button is pressed with no overlay open
- **THEN** the app closes

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

