# feedback

## ADDED Requirements

### Requirement: Every async action shows it is in flight

A control that starts asynchronous work SHALL show in-flight state from the moment it is
activated until the work settles: the control SHALL be disabled against a second activation
and SHALL carry a visible pending indication (an inline spinner with a pending label, or the
surface's own pending state). No user-triggered command SHALL be fire-and-forget as far as
the screen is concerned.

The in-flight state SHALL survive the triggering surface closing: if the surface that
started the work is dismissed while the work runs, reopening it (or the surface that shows
the result) SHALL still reflect the pending action until it settles.

#### Scenario: A pending action cannot be double-fired

- **WHEN** the user activates a control that starts async work and activates it again before
  the work settles
- **THEN** the second activation does nothing, and the control visibly shows the work is
  still running

#### Scenario: Device actions are no longer silent

- **WHEN** the user confirms a pairing, renames a device, or removes one, and the operation
  takes noticeable time
- **THEN** the triggering control shows a pending indication until the operation settles

#### Scenario: Pending state outlives its surface

- **WHEN** the user starts an async action from a drawer or dialog and closes it before the
  action settles
- **THEN** the action keeps running, and the state it settles into is reflected wherever its
  result is shown

### Requirement: Pending indications come from shared primitives

The pending vocabulary SHALL be supplied by shared primitives — one busy-button treatment,
one inline pending-hint, one spinner with a small named size scale — and feature components
SHALL NOT hand-roll their own spinner sizes or pending layouts. A pattern needed by two
screens SHALL exist once.

#### Scenario: One spinner scale

- **WHEN** the codebase is searched for raw spinner size classes in feature components
- **THEN** none are found, and every spinner takes one of the named sizes the primitive offers

#### Scenario: The same wait looks the same everywhere

- **WHEN** two screens report the same kind of wait (a button working, an inline background
  report, a panel-level connect)
- **THEN** both render it through the same primitive, at the same size, with the same label
  placement

### Requirement: One surface per kind of failure

Failure reporting SHALL follow one rule based on where the user's attention is:

- A failure of the flow the user is inside — a transfer starting or running, a code being
  redeemed in an open surface — SHALL report inline in that surface, where the user is
  already looking.
- A failure of a background or incidental action — a rename, a removal, a copy, an event
  arriving from elsewhere — SHALL report as a toast.

One action SHALL NOT report through different surfaces depending on incidental detail. In
particular, a send that fails SHALL report inline in the Send panel whether its target was a
code or a paired device.

#### Scenario: Send failures land in one place

- **WHEN** a send fails to start or fails mid-transfer, for a code target or a device target
- **THEN** the Send panel shows the failure inline, and no toast reports the same failure

#### Scenario: Background failures toast

- **WHEN** a rename or removal fails
- **THEN** a toast reports it, and the screen the user is on does not gain an inline error
  block for it

#### Scenario: A flow the user is inside reports inline

- **WHEN** redeeming a typed or scanned code fails while its surface is open
- **THEN** the failure is shown in that surface, not as a toast behind it

### Requirement: Success is a state change the user can see

Success SHALL be shown as a visible state change — a completion screen for a finished flow,
an in-place confirmation for a quick action (a copy control confirming, a rename settling
into the new name), or a visible arrival for something new in a list. Success SHALL NOT be
reported by toast, and SHALL NOT be silent: every action the user takes SHALL have some
visible settle.

#### Scenario: Finished flows show completion

- **WHEN** a send or receive finishes
- **THEN** a completion state is shown in the panel, and no success toast appears

#### Scenario: Quick actions confirm in place

- **WHEN** the user copies a code
- **THEN** the copy control itself confirms briefly, and no toast appears

#### Scenario: Nothing succeeds invisibly

- **WHEN** any user-triggered action completes successfully
- **THEN** something the user can see changed: a screen state, an in-place confirmation, or
  an arriving row

### Requirement: A blocked control says why

A control that is disabled because of app state (not because input is merely incomplete)
SHALL have the reason said once, in one line, near the control. Input-completeness
disabling (a submit waiting on a full code) needs no explanation.

#### Scenario: State-blocked controls carry a reason

- **WHEN** a control is blocked because a service is unavailable or another operation holds
  the device
- **THEN** one line near the control says why, in the app's ordinary voice

#### Scenario: Incomplete input explains nothing

- **WHEN** a submit is disabled only because its input is not complete yet
- **THEN** no explanatory line is shown

### Requirement: Duplicated feedback patterns exist once

The completion screen, the empty-state hero, the copy-with-confirmation control, and the
inline pending report SHALL each be one shared component. Send and Receive SHALL render
their completion and empty states through the same components, differing only in copy and
actions.

#### Scenario: One completion component

- **WHEN** the send completion and the receive completion render
- **THEN** both are the same component with different copy, and a styling change to one is a
  styling change to both

#### Scenario: One empty hero

- **WHEN** the Send queue is empty and the Receive panel is idle
- **THEN** both heroes render through one shared component
