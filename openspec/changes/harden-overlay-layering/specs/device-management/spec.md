# device-management (delta)

## MODIFIED Requirements

### Requirement: A shown code says how long it lasts and when it is spent

A pairing code shown to the user SHALL carry its remaining life on screen, counted
down from the lifetime the core reports for that code. The UI SHALL NOT hard-code
the pairing timeout: the number it counts down from SHALL come from the same value
the core enforces.

When the countdown reaches zero the code SHALL be marked spent: it SHALL stop being
presented as usable, the QR SHALL no longer be readable as a live code, and one
control SHALL offer a new code.

A code the other device has already used SHALL stop being presented at the moment
this device learns it was used. Because learning that is the same moment the
confirmation appears, the panel showing the code SHALL close rather than switch to a
spent state: the confirmation says who redeemed the code and is the only thing left
to answer. Reopening the panel afterwards SHALL show a fresh code, not the one that
was redeemed.

Copying the code SHALL be the only action offered while a code is live. Replacing a code
that still works SHALL NOT have a control of its own: the panel replaces the code when it
runs out, which is the one moment the offer is useful, and a second control there costs
space for something nobody needs.

The code's remaining time SHALL be shown on the code's own surface rather than as a
sentence beside it.

The copy SHALL say what happened and the one thing to do, in the app's ordinary
voice, and SHALL NOT use "expired", "timeout", "session", or an em dash.

#### Scenario: A live code shows its remaining time

- **WHEN** a pairing code is on screen
- **THEN** its remaining time is shown on the code's own surface, decreasing as time passes

#### Scenario: Copy is the only action on a live code

- **WHEN** a live code is on screen
- **THEN** copying it is the action offered, and no control asks for a replacement

#### Scenario: A replacement is offered once the code has run out

- **WHEN** a shown code runs out
- **THEN** the same row offers a new code

#### Scenario: A run-out code stops looking usable

- **WHEN** a shown code's time runs out
- **THEN** the code and its QR are replaced rather than left on display, and a control offers a new one

#### Scenario: A used code closes the panel

- **WHEN** another device redeems the code this device is showing
- **THEN** the panel showing that code closes and the confirmation is the only surface
  on screen

#### Scenario: Reopening after a redeem shows a new code

- **WHEN** the user declines the confirmation and opens the code panel again
- **THEN** a fresh code is shown with a full countdown

#### Scenario: A new code restarts the countdown

- **WHEN** the user asks for a new code after one ran out
- **THEN** a fresh code is shown with a full countdown and the spent state is gone
