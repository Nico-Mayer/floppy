# transfer-panel-layout

## ADDED Requirements

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
