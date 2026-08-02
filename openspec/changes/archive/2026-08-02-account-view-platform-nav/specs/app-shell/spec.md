# app-shell (delta)

## MODIFIED Requirements

### Requirement: A single shell serves every platform and width

The application SHALL render one shell built on a single `Sidebar.Provider`. Platform (macOS /
Windows / Linux / iOS / Android) SHALL determine the header chrome and which destinations
exist; available width SHALL determine only which navigation surface renders.

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

### Requirement: The bottom bar lists every destination and stays put

Below the navigation's rail threshold the navigation SHALL be a bottom bar listing every
top-level destination the running platform declares, read from the single shared destination
source. Each item SHALL carry an icon and a text label, and the item for the current
destination SHALL be visually distinct from the rest. Choosing an item SHALL navigate
directly, in one tap, with no intermediate surface to open or dismiss.

The bar SHALL be present on every route and in every application state, including while a
transfer is running. Navigation SHALL NOT be blocked, deferred, or queued on account of a
running transfer, because leaving a transfer's route does not affect the transfer.

The one exception is the platform's own soft keyboard, which takes its height out of the
layout the bar sits in. While a text field is focused the bar SHALL stand down rather than
be displaced upward to sit above the keys, which is what no platform's own navigation does,
and it SHALL return as soon as the field is blurred. This is occlusion by a system surface,
not the app withholding navigation.

#### Scenario: The bar lists every destination

- **WHEN** the app runs below the rail threshold
- **THEN** a bottom bar renders one labelled item per top-level destination the running
  platform declares, read from the same shared source the desktop sidebar reads

#### Scenario: One tap navigates

- **WHEN** the user taps a bar item
- **THEN** the app navigates to that destination immediately, with no drawer, sheet, or menu
  opening first

#### Scenario: The current destination is marked

- **WHEN** any destination is showing
- **THEN** that destination's bar item is visually distinct and the others are not

#### Scenario: The bar stays during a transfer

- **WHEN** a send or a receive is in progress
- **THEN** the bar remains visible and every destination stays reachable

#### Scenario: The keyboard does not push the bar up

- **WHEN** the user focuses a text field on a phone and the soft keyboard opens
- **THEN** the bar is not rendered above the keyboard, the focused field stays in view, and the
  bar reappears when the field is blurred

#### Scenario: Leaving a transfer's route does not cancel it

- **WHEN** a transfer is running and the user navigates to another destination
- **THEN** the transfer continues, and returning to its route shows its current state

## REMOVED Requirements

### Requirement: The account row navigates to Settings rather than opening a dialog

**Reason**: The account has its own destination now. Sign-in no longer lives on the Settings
screen, and phone chrome carries an Account destination in the bottom bar, so both the
navigation target and the "no mobile account affordance" rule this requirement stated are
obsolete.
**Migration**: Replaced by "The account row navigates to the Account destination" below and
by the destination-set rules in "The destination set is platform-aware but single-sourced".

## ADDED Requirements

### Requirement: The account row navigates to the Account destination

The sidebar's account row SHALL navigate to the Account destination. It SHALL NOT open a
transient dialog, and sign-in SHALL live on the Account screen as its body, so there is one
place the account is presented and one way to reach it per platform.

Sign-in status SHALL be conveyed in text wherever it is shown. It SHALL NOT be represented by
an icon alone, because the account avatar has no image to distinguish states and would render
identically signed in and signed out.

#### Scenario: The account row navigates

- **WHEN** the user activates the sidebar's account row
- **THEN** the app navigates to the Account destination and no dialog opens

#### Scenario: Sign-in lives on the Account screen

- **WHEN** the user opens the Account destination
- **THEN** the sign-in surface is the body of that screen

#### Scenario: Status is stated in words

- **WHEN** the account row renders while signed out
- **THEN** it says so in text rather than relying on the avatar to communicate it

### Requirement: The destination set is platform-aware but single-sourced

Which top-level destinations exist SHALL be declared once, in the single shared destination
source, with each entry stating which platforms it belongs to. Phone chrome SHALL declare
Send, Receive, Devices, and Account, and SHALL NOT declare Settings. Desktop SHALL declare
Send, Receive, Devices, and Settings in its navigation list, and SHALL reach Account through
the sidebar's account row rather than a list entry.

Every consumer of the destination list — both navigation surfaces, the navigation keyboard
shortcuts, and the route-transition ordering — SHALL read the filtered list for the running
platform from that one source. The platform test SHALL be form factor (phone chrome), not
width: a narrow desktop window SHALL keep the desktop set.

#### Scenario: Phone chrome shows Account, not Settings

- **WHEN** the app runs on phone chrome
- **THEN** the bottom bar's items are Send, Receive, Devices, and Account, and no Settings
  destination is reachable from navigation

#### Scenario: Desktop shows Settings, and Account only via the account row

- **WHEN** the app runs on desktop
- **THEN** the navigation list's items are Send, Receive, Devices, and Settings, and the
  Account destination is reachable through the sidebar's account row

#### Scenario: A narrow desktop window keeps the desktop set

- **WHEN** a desktop window is resized below the rail threshold
- **THEN** the bottom bar renders the desktop destination set, Settings included

#### Scenario: The Account bar item wears the avatar

- **WHEN** phone chrome renders the bottom bar
- **THEN** the Account item's icon is the account's avatar glyph and its label is "Account"

### Requirement: Phone theme follows the system

On phone chrome the application's theme SHALL follow the system appearance. No in-app theme
control SHALL render on phone chrome, and a theme preference stored by an earlier build SHALL
be reset to follow the system at startup, so no phone is ever stuck on a choice it can no
longer change.

Desktop SHALL keep the in-app theme control, offering light, dark, and system.

#### Scenario: The phone follows a system appearance change

- **WHEN** the OS switches between light and dark while the app runs on phone chrome
- **THEN** the app follows without any in-app setting being consulted

#### Scenario: A stale stored preference is cleared

- **WHEN** the app starts on phone chrome with a previously stored theme preference
- **THEN** the preference is reset to system and the system appearance wins

#### Scenario: Desktop still chooses

- **WHEN** the user opens Settings on desktop
- **THEN** a theme control offers light, system, and dark, and the choice persists
