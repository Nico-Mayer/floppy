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

### Requirement: A system prompt does not share the screen with a user-opened panel

A prompt the app raises on its own — an incoming pairing request, an incoming
transfer offer — SHALL take the screen. Any panel the user opened SHALL close when
such a prompt appears, so the two are never stacked.

This SHALL hold however the panel was opened and whichever panel it is, and SHALL be
expressed once rather than repeated per panel.

Closing a panel this way SHALL NOT count as the user cancelling whatever the panel
was for, and SHALL NOT be reported as an error.

#### Scenario: Only the prompt is on screen

- **WHEN** a system prompt appears while a panel is open on a phone
- **THEN** the panel closes and the prompt is the only surface over the page, with a
  single dim behind it

#### Scenario: Dismissing the prompt returns to the page

- **WHEN** the user answers or dismisses that prompt
- **THEN** the page underneath is shown, with no panel left half-open behind it
