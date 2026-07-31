# mobile-navigation (delta)

## ADDED Requirements

### Requirement: The navigation drawer is one flat surface, not a bottom-sheet card

The navigation drawer SHALL present a single continuous surface anchored to the screen
edge it slides from. It SHALL NOT borrow the inset floating-card treatment the shared
drawer primitive gives bottom sheets: no second background colour inside the panel, no
outline around an inset region, and no large corner radius on a full-height
edge-anchored panel.

Suppressing that treatment SHALL be scoped to the navigation drawer. Transient bottom
sheets elsewhere in the app SHALL keep the card look unchanged.

#### Scenario: The drawer has no inset card

- **WHEN** the navigation drawer is open on a phone
- **THEN** the panel is one uninterrupted surface from edge to edge, with no inset
  outline, no second background colour, and no rounded region floating inside it

#### Scenario: Menu rows are not clipped by a corner radius

- **WHEN** the navigation drawer is open and scrolled to the top or the bottom
- **THEN** the first and last rows are fully drawn, with no corner cutting into them

#### Scenario: Bottom sheets keep their card

- **WHEN** a transient bottom sheet is opened anywhere else in the app
- **THEN** it still renders as an inset floating card with its outline, radius, and
  shadow
