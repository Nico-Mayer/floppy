# app-shell

## ADDED Requirements

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

#### Scenario: Content clears the notch and home indicator

- **WHEN** the app runs on a device with a notch and a home indicator
- **THEN** the header clears the top inset and the drawer and bottom-anchored actions
  clear the bottom inset, with no content under the system bars
