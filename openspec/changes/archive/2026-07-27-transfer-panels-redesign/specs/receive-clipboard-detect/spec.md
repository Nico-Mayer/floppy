# receive-clipboard-detect (delta)

## MODIFIED Requirements

### Requirement: Auto-filled values show provenance and a one-click clear
When a code is auto-filled, the app SHALL play a brief entrance animation on the code input so the fill is visible as it happens (collapsing to a fade under reduced-motion preferences). The code input SHALL show an inline clear control whenever it is non-empty, regardless of how the value was entered. Activating the clear control SHALL empty the input; if the cleared value was auto-filled, that value SHALL NOT be auto-filled again for the current app session.

#### Scenario: Auto-fill is animated
- **WHEN** a code is auto-filled into the input
- **THEN** the input plays a brief entrance animation (fade-only when the user prefers reduced motion)

#### Scenario: Clear control follows input content
- **WHEN** the input is non-empty (typed or auto-filled)
- **THEN** an inline clear control is visible in the input; when the input is empty it is hidden

#### Scenario: Clearing an auto-filled value
- **WHEN** the user activates the clear control while the input holds an auto-filled code
- **THEN** the input becomes empty and the same clipboard value is not auto-filled again this session

#### Scenario: Clearing a typed value
- **WHEN** the user activates the clear control while the input holds a hand-typed code
- **THEN** the input becomes empty
