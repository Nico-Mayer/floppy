# transfer-panel-layout

## Purpose

Define the responsive layout contract for the Send and Receive transfer panels: container-width-driven compact/regular layouts, touch-target minimums on coarse-pointer devices, mascot retention, and a stable two-zone (status/action) structure across all panel states.
## Requirements
### Requirement: Panels adapt to their container width

The Send and Receive panels SHALL switch between a compact and a regular layout based on the width of their containing card (CSS container queries), not the viewport. The compact layout SHALL be fully usable — no clipped content, no horizontal scrolling — at the minimum window width of 500px.

#### Scenario: Narrow card uses compact layout

- **WHEN** the window is resized to its minimum width (500px)
- **THEN** panels render the compact layout: stacked content, smaller mascot, full-width primary actions, no horizontal overflow

#### Scenario: Wide card uses regular layout

- **WHEN** the card is wide enough for the regular breakpoint
- **THEN** idle states render the mascot beside the copy and controls at content width

#### Scenario: Send waiting state leads with QR when compact

- **WHEN** the send panel shows the code/QR waiting state in a compact-width card
- **THEN** the QR code renders large and stacked above the code phrase; in regular width it recedes beside the phrase

### Requirement: Touch devices get minimum 44px targets and 16px code text

On coarse-pointer devices, every interactive control in the transfer panels SHALL have a hit area of at least 44×44 CSS pixels, and code entry/display text SHALL render at 16px or larger. Fine-pointer (desktop mouse/trackpad) densities SHALL remain unchanged.

#### Scenario: Coarse pointer enlarges controls

- **WHEN** the app runs on a coarse-pointer device (or devtools touch emulation)
- **THEN** buttons, inputs, and icon controls in the panels measure at least 44px in each hit-area dimension

#### Scenario: Fine pointer keeps desktop density

- **WHEN** the app runs with a mouse/trackpad
- **THEN** control sizes are unchanged from the current desktop sizing

#### Scenario: Code input does not trigger mobile zoom

- **WHEN** the receive code input is focused on a coarse-pointer device
- **THEN** its text size is at least 16px

### Requirement: Mascot is retained in idle states

Both panels SHALL show the mascot in their idle states in both layouts: reduced and stacked in compact, beside the descriptive copy in regular. The mascot SHALL NOT be removed to solve space constraints.

#### Scenario: Compact idle keeps mascot

- **WHEN** the receive panel is idle in a compact-width card
- **THEN** the mascot is visible (smaller, stacked above the copy)

#### Scenario: Regular idle shows hero row

- **WHEN** the receive panel is idle in a regular-width card
- **THEN** the mascot renders beside the title/description as a horizontal group

### Requirement: All states share a stable two-zone structure

Every panel state (idle, connecting/waiting, transferring, done, cancelling) SHALL render into the same structure: a flexible status zone above and an anchored action zone at the bottom of the card. Primary and destructive actions SHALL appear in the action zone at a consistent position across states.

#### Scenario: Action row does not jump between states

- **WHEN** the receive panel transitions idle → connecting → receiving → done
- **THEN** the action controls (Receive files / Cancel / Open folder) render at the same anchored bottom position in every state

#### Scenario: Tall content scrolls inside the status zone

- **WHEN** the send file list grows beyond the available card height
- **THEN** the list scrolls within the status zone and the action zone stays visible and anchored

### Requirement: Receive clipboard auto-fill presentation survives the restructure

The restructured receive panel SHALL preserve the behaviors of the `receive-clipboard-detect` capability as amended by this change: auto-fill semantics are unchanged, the fill is signaled by an animation on the input, and the input carries an inline clear control whenever it is non-empty.

#### Scenario: Fill signal and clear control in both layouts

- **WHEN** a code has been auto-filled in either compact or regular layout
- **THEN** the input plays the fill animation and shows the inline clear control

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

