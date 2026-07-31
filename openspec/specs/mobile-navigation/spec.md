# mobile-navigation Specification

## Purpose

TBD - created by archiving change unify-responsive-shell. Update Purpose after archive.

## Requirements

### Requirement: Mobile navigation is the sidebar as a left drawer

On touch or narrow-width devices the navigation SHALL be the same sidebar rendered as a
left-edge drawer, reusing the shared destination list. The drawer SHALL be openable by a
menu (hamburger) control in the header. Choosing a destination SHALL close the drawer so
that navigating is a single action.

#### Scenario: Hamburger opens the drawer

- **WHEN** the user taps the header menu control on a phone
- **THEN** the navigation drawer slides in from the left showing the same destinations as
  the desktop sidebar

#### Scenario: Navigating collapses the drawer

- **WHEN** the drawer is open and the user selects a destination
- **THEN** the app navigates to that destination and the drawer closes

#### Scenario: Same destinations everywhere

- **WHEN** the drawer is compared to the desktop sidebar
- **THEN** both list the identical top-level destinations from the single shared source

### Requirement: The drawer is reachable and dismissable one-handed

The menu control SHALL remain a visible, tappable affordance so the drawer is reachable
without knowing the gesture, and the drawer SHALL be dismissable by tapping the overlay,
by choosing a destination, and (on Android) by the hardware back button. While the drawer
is open it MAY cover the menu control; closing does not depend on it.

#### Scenario: Overlay tap closes the drawer

- **WHEN** the drawer is open and the user taps the dimmed area outside it
- **THEN** the drawer closes and no navigation occurs

#### Scenario: Hardware back closes the drawer first

- **WHEN** the drawer is open on Android and the hardware back button is pressed
- **THEN** the drawer closes instead of the app closing or navigation changing
