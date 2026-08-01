## ADDED Requirements

### Requirement: The chosen send target is shared state and survives leaving the panel

The send target the user has chosen SHALL live in the shared send state, not in the Send panel's
own component state, so it survives leaving the Send screen and coming back. Someone who picked a
device, went to look at something else, and came back SHALL find the same target selected rather
than silently falling back to the code send.

Choosing a target SHALL never start a transfer. It picks who, and Send still owns what and when.

A target naming a device that is no longer trusted SHALL fall back to the code target, so a device
removed after being chosen can never be the thing Send points at.

#### Scenario: The selection survives navigation

- **WHEN** the user chooses a device in the Send target picker, leaves the Send screen, and returns
- **THEN** that device is still the selected target

#### Scenario: Choosing a target sends nothing

- **WHEN** a target is chosen
- **THEN** no transfer starts and the queue is untouched

#### Scenario: An un-trusted device falls back to the code target

- **WHEN** the chosen device is removed from the trust store
- **THEN** the selection falls back to the code target and Send does not point at the removed device
