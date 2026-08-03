# interaction (delta)

## MODIFIED Requirements

### Requirement: Touch feedback fires at the moments that carry meaning

On touch devices the app SHALL give haptic feedback at the moments where something was taken
from the user, handed to them, or arrived for them, and nowhere else. Feedback intensity
SHALL match the weight of the event, with completion and failure distinct from an incidental
tap.

The moments the user causes with their own finger:

- a code copied (light)
- a file removed from the send queue (light)
- a QR code read by the scanner (medium)
- an incoming offer answered (accept medium, decline light — accepting is heavier because
  more happened)
- a pull-to-refresh crossing its trigger distance (light), so the finger knows release
  will commit before it lets go

The moments that arrive from elsewhere:

- an incoming transfer offer or a pairing confirm request appearing (warning weight, the
  "something arrived for you" note)
- the other device accepting a trusted send (medium — the wait is over)
- a transfer finishing, in either direction (success weight)
- a pairing completing (success weight, the same note as a finished transfer)
- a transfer failing mid-flight, a pairing failing, or the other device declining (error
  weight, one note for all failures)

Changing destination SHALL NOT be one of those moments. Navigation is a tap on a bar item, a
click, or a shortcut rather than a gesture that could commit or spring back, and a tap that
merely moves between screens took nothing and handed over nothing.

#### Scenario: Transfer completion is felt

- **WHEN** a transfer finishes on a phone
- **THEN** a success-weight haptic fires once

#### Scenario: Copy and remove are light

- **WHEN** the user copies a code or removes a file from the queue on a phone
- **THEN** a light haptic fires once for each action

#### Scenario: Answering an offer is felt, accept more than decline

- **WHEN** the user accepts or declines an incoming transfer on a phone
- **THEN** a haptic fires, and accepting is the heavier of the two

#### Scenario: An arriving offer is felt

- **WHEN** an incoming transfer offer or a pairing confirm request appears while the app is
  visible on a phone
- **THEN** a warning-weight haptic fires once

#### Scenario: A failure is felt

- **WHEN** a transfer fails mid-flight, a pairing attempt fails, or the other device
  declines, while the app is visible on a phone
- **THEN** an error-weight haptic fires once

#### Scenario: The other device saying yes is felt

- **WHEN** a trusted send the user is waiting on is accepted by the other device, while the
  app is visible on a phone
- **THEN** a medium haptic fires once

#### Scenario: Pairing completion is felt

- **WHEN** a pairing completes on a phone with the app visible
- **THEN** a success-weight haptic fires once

#### Scenario: The pull trigger is felt

- **WHEN** a pull-to-refresh gesture crosses its trigger distance on a phone
- **THEN** a light haptic fires once, and crossing back and forth within the same touch does
  not fire it again

#### Scenario: Changing destination is silent

- **WHEN** the user taps a bottom-bar item to change destination on a phone
- **THEN** no haptic fires

#### Scenario: Ordinary taps are silent

- **WHEN** the user taps a control that is not one of the listed moments
- **THEN** no haptic fires

## ADDED Requirements

### Requirement: Event-driven feedback fires only in the foreground

A haptic moment driven by a backend event rather than by the user's own tap SHALL fire only
while the app is visible in the foreground. When the app is backgrounded, the OS
notification for that event carries the alert, and the operating system already applies its
own sound and vibration settings to it; the app SHALL NOT add a second buzz for the same
event.

Haptics caused directly by the user's finger need no such gate: the finger is on the screen,
so the app is foreground by construction.

#### Scenario: A background arrival does not buzz twice

- **WHEN** an incoming offer arrives while the app is in the background on a phone
- **THEN** the app fires no haptic of its own, and the OS notification alerts by the
  system's own settings

#### Scenario: A foreground arrival is felt without a notification

- **WHEN** an incoming offer arrives while the app is visible on a phone
- **THEN** the arrival haptic fires and no OS notification is shown, matching the existing
  foreground notification suppression
