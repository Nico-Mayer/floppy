## MODIFIED Requirements

### Requirement: A single shell serves every platform and width

The application SHALL render one shell built on a single `Sidebar.Provider`. Platform (macOS /
Windows / Linux / iOS / Android) SHALL determine only the header chrome; available width SHALL
determine only which navigation surface renders.

Width SHALL select between exactly two navigation surfaces: a bottom bar below the navigation's
rail threshold, and the sidebar at or above it. Exactly one SHALL render at a time. Selecting
between them SHALL NOT fork the rest of the shell tree: the provider, the routed content region,
and the platform header are the same elements at every width.

#### Scenario: Desktop and mobile share one shell tree

- **WHEN** the app mounts on any platform
- **THEN** it renders one `Sidebar.Provider` containing the platform header, one navigation
  surface, and the routed content, with no separate mobile-only shell branch

#### Scenario: Navigation below the rail threshold is a bottom bar

- **WHEN** the viewport is narrower than the navigation's rail threshold, on any platform
- **THEN** navigation is a bottom bar, the sidebar is not rendered at all, and no navigation
  drawer exists

#### Scenario: Navigation at or above the rail threshold is the sidebar

- **WHEN** the viewport is at or above the rail threshold
- **THEN** navigation is the sidebar and no bottom bar is rendered

#### Scenario: A narrow desktop window gets the bar and keeps its titlebar

- **WHEN** a desktop window is resized narrower than the rail threshold
- **THEN** navigation becomes the bottom bar while the desktop titlebar and window controls
  remain, because form factor has not changed

### Requirement: The header adapts its chrome to the platform

The header is platform chrome, not navigation. A single `AppHeader` SHALL provide it: on macOS a
traffic-light spacer and a window drag region, on Windows the min/maximize/close controls and a
drag region. On iOS and Android there SHALL be no header at all, because the platform has no
window to control and no window to drag, and the bottom bar already names the current
destination.

The header SHALL show a menu control only where it has something to toggle, which is where the
sidebar renders. It SHALL NOT render a control for a navigation drawer, because no drawer exists.

#### Scenario: macOS window is draggable and clears the traffic lights

- **WHEN** the app runs on macOS
- **THEN** the header reserves space for the native traffic lights and exposes a drag
  region, and no min/maximize/close buttons are drawn

#### Scenario: Windows renders custom window controls

- **WHEN** the app runs on Windows (frameless)
- **THEN** the header renders minimize, maximize, and close controls that operate the
  window

#### Scenario: Mobile renders no header

- **WHEN** the app runs on iOS or Android
- **THEN** no top app bar is rendered, the routed content begins at the top safe-area inset,
  and the screen's own heading names the destination

#### Scenario: Menu control appears only where the sidebar does

- **WHEN** the sidebar is rendered and collapsible
- **THEN** the header shows a menu control that toggles it between expanded and rail

#### Scenario: No menu control exists for the bar

- **WHEN** navigation is the bottom bar
- **THEN** no menu or hamburger control is rendered anywhere in the shell

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

Because the sidebar renders only at or above the rail threshold, both rows are inherently
absent below it. Neither SHALL be reproduced in the bottom bar or in mobile chrome.

#### Scenario: Brand and account rows match

- **WHEN** the sidebar is expanded
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

#### Scenario: Neither row appears in mobile chrome

- **WHEN** navigation is the bottom bar
- **THEN** no brand row and no account row are rendered, and the bar shows destinations only

### Requirement: The account row is separated from the destination list

A separator SHALL divide the destination list from the account row so the account row
reads as its own region rather than a further destination. The separator SHALL remain
visible when the sidebar is collapsed to the icon rail.

The account row SHALL NOT take the active-destination treatment, even when the route it
navigates to is the current one. It is an account affordance that happens to navigate, not an
entry in the destination list, and two rows SHALL NOT read as active at once.

#### Scenario: Separator divides nav from account

- **WHEN** the sidebar is expanded
- **THEN** a horizontal rule sits between the last destination and the account row

#### Scenario: Separator survives the rail

- **WHEN** the sidebar is collapsed to the icon rail
- **THEN** the separator is still drawn between the destination icons and the account
  avatar

#### Scenario: Only the destination row reads as active

- **WHEN** the account row's destination is the current route
- **THEN** that destination's row in the list shows as active and the account row does not

### Requirement: The shell respects safe areas on every platform

The shell SHALL keep content and chrome clear of the status bar, notch, home indicator,
and gesture rails using the per-edge safe-area tokens, resolving native Android insets
first and `env()` otherwise, and SHALL pad surfaces portaled onto `<body>` (sheets and
dialogs) clear of those areas.

Each inset SHALL have exactly one owner, so the responsibility can be neither duplicated nor
dropped. On mobile, where there is no top app bar, the routed content region SHALL own the top
inset. The bottom bar SHALL own the bottom inset. On desktop the header owns the top inset and
the sidebar's account row the bottom.

A safe-area inset applied to a surface that already carries its own padding SHALL be
added to that padding rather than replacing it. On a platform where an inset resolves
to zero, the surface SHALL keep the spacing it would have had without any inset.

#### Scenario: Content clears the notch and home indicator

- **WHEN** the app runs on a device with a notch and a home indicator
- **THEN** the routed content begins below the top inset, the bottom bar sits above the bottom
  inset, and no content sits under the system bars

#### Scenario: Nothing scrolls under the status bar

- **WHEN** a scrollable screen is scrolled on a phone
- **THEN** content stops at the top inset rather than passing beneath the status bar, and the
  inset region shows the page background

#### Scenario: A zero inset does not eat existing spacing

- **WHEN** the sidebar is shown on desktop, where the bottom safe-area inset is zero
- **THEN** the account row keeps its normal gap to the bottom edge of the window
  instead of sitting flush against it

#### Scenario: A real inset stacks on existing spacing

- **WHEN** the bottom bar is shown on a phone with a gesture bar
- **THEN** its items clear the gesture bar and still keep their normal gap above it

### Requirement: The shell names the platform signals it branches on

The shell SHALL distinguish, by name, between pointer coarseness, viewport narrowness, and
platform form factor, and each branch in the app SHALL state which of the three it depends on.
These are separate questions and SHALL NOT be conflated behind a single "mobile" test.

Pointer coarseness governs hit areas, controls that cannot be revealed by hover, and whether
touch feedback fires. Viewport narrowness governs full-bleed content layout and whether a
transient surface is a centred dialog or a bottom drawer. Platform form factor governs whether a
window titlebar exists at all, the mobile document flag, and hiding actions the platform cannot
perform.

The navigation's own threshold SHALL remain separate and separately named. It decides between the
bottom bar and the icon rail, because when a rail is worth the horizontal room is a different
question from when content should go full-bleed. No fourth threshold SHALL be introduced for the
bar.

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

#### Scenario: The navigation threshold stays its own

- **WHEN** the navigation decides between the bottom bar and the icon rail
- **THEN** it uses its own named threshold, and changing the content threshold does not move
  where that switch happens

## ADDED Requirements

### Requirement: The account row navigates to Settings rather than opening a dialog

The sidebar's account row SHALL navigate to the Settings destination. It SHALL NOT open a
transient dialog, and sign-in SHALL live on the Settings screen as a section of that page, so
there is one place the account is presented and one way to reach it.

Sign-in status SHALL be conveyed in text wherever it is shown. It SHALL NOT be represented by an
icon alone, because the account avatar has no image to distinguish states and would render
identically signed in and signed out.

Mobile SHALL carry no account affordance in its chrome. The Settings destination is in the bottom
bar, a bar item has no room for a status line, and reserving primary navigation for account
state would over-weight it.

#### Scenario: The account row navigates

- **WHEN** the user activates the sidebar's account row
- **THEN** the app navigates to the Settings destination and no dialog opens

#### Scenario: Sign-in lives on the Settings screen

- **WHEN** the user opens Settings
- **THEN** the sign-in surface is a section of that page

#### Scenario: Status is stated in words

- **WHEN** the account row renders while signed out
- **THEN** it says so in text rather than relying on the avatar to communicate it

#### Scenario: Mobile chrome carries no account control

- **WHEN** navigation is the bottom bar
- **THEN** no avatar or account control is rendered in any chrome, and the Settings item is a
  destination like any other
