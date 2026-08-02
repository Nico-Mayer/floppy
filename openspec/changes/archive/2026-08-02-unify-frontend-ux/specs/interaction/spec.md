# interaction — delta

## ADDED Requirements

### Requirement: State-change motion comes from one vocabulary

Every animated state change in the app — a panel changing state, an overlay opening or
closing, a list row arriving or leaving, an error appearing — SHALL take its duration and
easing from the shared motion module or the shared keyframes, not from values written at the
call site. A feature component SHALL NOT carry its own hard-coded animation duration.

The vocabulary SHALL stay small and named: an entrance, an attention pop, an error shake,
and an arrival, each defined once. A new animated moment SHALL reuse one of them or extend
the vocabulary, not inline its own timing.

#### Scenario: No hard-coded durations in feature components

- **WHEN** the feature components are searched for literal transition durations
- **THEN** none are found, and every transition reads its timing from the shared motion
  module or a shared keyframe

#### Scenario: The same kind of moment moves the same way

- **WHEN** two different screens animate the same kind of moment (two panel entrances, two
  errors appearing)
- **THEN** both use the same named treatment, with the same timing

### Requirement: A row that arrives because of the user is seen arriving

A list row that appears as the result of a user action — a device joining the paired list, a
file joining the send queue — SHALL enter with a shared arrival treatment: motion into
place plus a brief self-decaying highlight. A row that is merely part of an initial render
SHALL NOT use it; the treatment marks change, not existence.

Under reduced motion the movement SHALL collapse to a fade while the brief highlight
remains, because the highlight is the information.

#### Scenario: A caused row is marked

- **WHEN** a row is added to a visible list as the result of a user action
- **THEN** it enters with the arrival treatment and the highlight fades on its own

#### Scenario: Initial render is calm

- **WHEN** a list first renders with its existing items
- **THEN** no row carries the arrival treatment

#### Scenario: Reduced motion keeps the highlight

- **WHEN** the user prefers reduced motion and a caused row arrives
- **THEN** the movement is a fade and the brief highlight still marks the row
