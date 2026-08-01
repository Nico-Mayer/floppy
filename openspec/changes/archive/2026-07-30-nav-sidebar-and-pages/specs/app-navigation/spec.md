# app-navigation

## ADDED Requirements

### Requirement: Sidebar navigation shell

The app SHALL present a persistent sidebar shell with real routes for its top
sections, replacing the account sheet and its in-sheet view stack. Global app
lifecycle SHALL be owned by the root layout so it survives navigation.

#### Scenario: Navigate between sections

- **WHEN** the user selects a sidebar item (Transfer, Pair devices, Activity, Settings)
- **THEN** the app routes to that section (`/`, `/pair`, `/activity`, `/settings`) and the item shows as active

#### Scenario: Lifecycle survives navigation

- **WHEN** the user navigates from Transfer to another section and back
- **THEN** transfer and pairing event listeners, native drag-drop, and the incoming offer/pair prompts keep working — they are wired once in the root layout, not per page

#### Scenario: Mobile sidebar

- **WHEN** the app is narrow (mobile)
- **THEN** the sidebar collapses to an off-canvas drawer reachable from a trigger, and the window titlebar/controls stay usable

#### Scenario: Account in the footer

- **WHEN** the user looks at the sidebar footer
- **THEN** the (placeholder) sign-in lives there
