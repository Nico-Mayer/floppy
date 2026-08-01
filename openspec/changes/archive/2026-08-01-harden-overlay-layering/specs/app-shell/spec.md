# app-shell (delta)

## ADDED Requirements

### Requirement: Overlay paint order comes from a named layer scale

Every surface that paints over the page SHALL declare which layer it belongs to, and
the layers SHALL be defined in one place as named tokens rather than as numbers
chosen at each call site. A surface SHALL NOT hard-code a stacking value of its own.

The scale SHALL have one layer per kind of surface, ordered from the back:

- the app header, which paints over page content and under every overlay
- panels the user opened — dialogs, drawers, sheets, and the popovers of controls
  inside them
- the camera's own chrome while scanning
- system prompts, which arrive unasked and SHALL paint over everything the app draws
- toasts, which SHALL remain above all of the above

A surface's layer SHALL NOT depend on when its portal was mounted, on which route is
displayed, or on the order the user opened things. Two surfaces on different layers
SHALL paint in scale order under every navigation history.

A surface's dimming overlay SHALL sit on the same layer as the surface it dims, so a
lower panel can never appear through a higher surface's dim.

#### Scenario: Route history does not change what is on top

- **WHEN** a system prompt opens while a panel opened from a route is already on
  screen, and that route was reached by navigating away and back
- **THEN** the prompt and its dim paint over the panel, exactly as they do on the
  first visit to that route

#### Scenario: A prompt is visible over the camera

- **WHEN** an incoming transfer offer arrives while the camera is scanning
- **THEN** the prompt is shown over the camera chrome rather than hidden behind it,
  and the scan is not cancelled

#### Scenario: The header does not survive a dim

- **WHEN** a dialog is open on desktop
- **THEN** the header is dimmed with the rest of the page rather than staying bright
  above the overlay

#### Scenario: A toast is readable over any surface

- **WHEN** a toast appears while any overlay is open
- **THEN** it is readable above that overlay

### Requirement: An overlay is never closed to make room for another

When a surface the app opens on its own arrives over a panel the user opened, the
panel SHALL stay open and the prompt SHALL paint over it. Nothing SHALL be closed,
dismissed, or cancelled in order to give a prompt the screen: the layer scale is what
decides which one is in front, and it decides without anything having to move.

The rule holds because a panel and a prompt animating in opposite directions at the
same moment is not a state the overlay primitives support. Their scroll-lock and
body-position bookkeeping is shared across instances, so a close overlapping an open
corrupts it, and the arriving surface can fail to appear at all.

#### Scenario: The prompt arrives over an open panel

- **WHEN** a prompt the app raised itself arrives while a panel is open
- **THEN** the prompt and its dim paint over the panel, and the panel is still open
  underneath

#### Scenario: Answering the prompt leaves the panel as it was

- **WHEN** the user answers or dismisses that prompt
- **THEN** the panel underneath is still open and still shows what it showed before

### Requirement: A prompt that arrives unasked carries no text field

A surface the app opens on its own SHALL ask a question and offer its answers, and
SHALL NOT contain a text field. Anything the user might want to type SHALL be
editable afterwards, on the surface that owns the thing being edited.

The rule is about the field, not about focus. A prompt that arrives unasked cannot
control what raises the soft keyboard once a field is on screen: focus can be placed
by the app, by the platform restoring a remembered field, or by a tap landing in a
panel as it slides up. Removing the field is what makes the keyboard impossible
rather than merely unlikely.

A panel the user opened in order to type SHALL be unaffected: it SHALL keep its field
and keep focusing it, because that is what the user asked for.

#### Scenario: No keyboard on an unasked prompt

- **WHEN** a prompt the app raised itself opens on a phone
- **THEN** the soft keyboard stays down, and the panel does not resize or scroll to
  make room for one

#### Scenario: The prompt is a question and its answers

- **WHEN** such a prompt opens
- **THEN** it shows what happened and the answers, and offers nothing to type into

#### Scenario: Editing is still reachable afterwards

- **WHEN** the user wants to change something the prompt did not ask about
- **THEN** it is editable on the screen that lists the thing, once the prompt is
  answered

#### Scenario: A panel opened to type still focuses its field

- **WHEN** the user opens a panel whose purpose is entering something
- **THEN** its field is focused and the keyboard comes up as usual
