# transfer-panel-layout

## ADDED Requirements

### Requirement: The Transfer screen dissolves its card chrome on mobile

Below the `sm` breakpoint the Transfer screen SHALL present as one full-bleed surface
rather than a floating card inside padding. The `TransferCard` SHALL drop its border,
shadow, radius, and background so it becomes the page; the page SHALL drop its outer
padding and max-width so content spans the full width; and the card header SHALL slim to
remove desktop-density chrome (the monospace headline row). At `sm` and above the desktop
card presentation SHALL be unchanged. Feature parity SHALL be preserved: the same
send/receive tabs, states, action zone, and file-drop target remain.

#### Scenario: Mobile card is full-bleed

- **WHEN** the Transfer screen renders below the `sm` breakpoint
- **THEN** the transfer surface spans the full content width with no card border, shadow,
  radius, or outer page padding, and no centered narrow column

#### Scenario: Desktop card is unchanged

- **WHEN** the Transfer screen renders at `sm` width or above
- **THEN** the `TransferCard` retains its border, shadow, radius, background, and header
  as before

#### Scenario: Full-bleed width triggers the roomy panel layouts

- **WHEN** the mobile card is full-bleed and its content width crosses the panels'
  container-query breakpoints
- **THEN** the Send and Receive panels render their regular (roomy) layouts, as already
  defined by the container-query requirement, without any mobile-specific panel code

#### Scenario: Feature parity holds on mobile

- **WHEN** the Transfer screen is used on a phone
- **THEN** the send/receive switch, every transfer state, the anchored action zone, and
  the file-drop target behave exactly as on desktop

### Requirement: The mobile mode switcher is a flush, bottom-anchored segmented control

On mobile the Send/Receive switcher SHALL render as a flush segmented control anchored at
the bottom of the transfer column (thumb reach), without a floating shadow, so it reads as
part of the page rather than a second stacked card. On desktop the switcher SHALL stay at
the top with its current styling.

#### Scenario: Mobile switcher is flush and bottom-anchored

- **WHEN** the Transfer screen renders on a phone
- **THEN** the Send/Receive switcher is a flat segmented control at the bottom of the
  column, in thumb reach, with no drop shadow and no floating-card appearance

#### Scenario: Desktop switcher is unchanged

- **WHEN** the Transfer screen renders on desktop
- **THEN** the switcher stays at the top with its current styling
