## ADDED Requirements

### Requirement: Every interactive control meets a 44px minimum hit area on coarse pointers

On coarse-pointer devices, every interactive control anywhere in the app SHALL have a hit area
of at least 44×44 CSS pixels. On fine-pointer devices control sizing SHALL be unchanged from
current desktop density. This requirement covers the whole app, not one screen: the header,
the navigation, dialogs and drawers, every page, and every panel.

A control MAY meet the minimum in one of two ways:

- **Grow** — the visible box itself reaches at least 44px.
- **Hit slop** — the visible box keeps its size, and an invisible region centred on it receives
  the pointer. That region SHALL be at least 48px in each axis and SHALL never be smaller than
  the control's own box, so the guarantee holds at every control size rather than depending on
  one. How far the slop extends beyond the visible box therefore varies with that box: a 24px
  control is surrounded by 12px of slop on each side, a 36px control by 6px.

#### Scenario: Coarse pointer meets the minimum everywhere

- **WHEN** the app runs on a coarse-pointer device, on any screen
- **THEN** every button, input, icon control, navigation row, and dialog action measures at
  least 44 CSS pixels in each hit-area dimension

#### Scenario: Fine pointer keeps desktop density

- **WHEN** the app runs with a mouse or trackpad
- **THEN** control sizes and page layout are unchanged from current desktop sizing, and no
  control has grown

#### Scenario: Slop does not move anything

- **WHEN** a control satisfies the minimum through hit slop rather than growth
- **THEN** its visible dimensions and the surrounding layout are identical on coarse and fine
  pointers

### Requirement: Destructive, primary, and navigation controls grow rather than slop

A control that is destructive, is the primary action of its surface, or navigates SHALL meet
the minimum by growing its visible box. Incidental and reversible controls MAY meet it with hit
slop. A person aiming at a destructive action must be able to see the target they are hitting.

#### Scenario: Destructive control grows

- **WHEN** a destructive control renders on a coarse-pointer device
- **THEN** its visible box measures at least 44 CSS pixels in each dimension, whatever size
  variant the call site requested

#### Scenario: Incoming transfer actions are large

- **WHEN** an incoming transfer or pairing prompt renders on a phone
- **THEN** its accept and decline actions are full-width stacked controls of at least 44px, and
  decline is not immediately adjacent to accept along the same axis of travel

#### Scenario: Incidental control keeps its visual size

- **WHEN** a clear, copy, or dismiss control renders on a coarse-pointer device
- **THEN** its visible box is unchanged and its hit area measures at least 48 CSS pixels in
  each dimension

### Requirement: The minimum is enforced by the shared control primitives

The hit-area minimum SHALL be a property of the shared button and menu-row primitives, derived
from the size and variant a call site already selects, and SHALL NOT require per-call-site
classes. An explicit override SHALL exist for the cases where the derived choice is wrong. No
feature component SHALL carry its own hand-written touch-size class.

#### Scenario: A new control inherits the minimum

- **WHEN** a developer adds a control using a shared primitive without any touch-related class
- **THEN** that control already meets the minimum on coarse pointers

#### Scenario: No per-call-site touch classes remain

- **WHEN** the codebase is searched for hand-written coarse-pointer or minimum-height classes
  on feature components
- **THEN** none are found, and the behaviour they provided is supplied by the primitives

#### Scenario: Override is available where inference is wrong

- **WHEN** a call site needs the other treatment than the one its size implies
- **THEN** it can request grow or slop explicitly, and that request wins

### Requirement: Hit slop requires clearance and isolation

Hit slop SHALL only be used where it can actually receive the pointer and cannot steal from a
neighbour. The control SHALL have clearance from any ancestor that clips overflow of at least
the distance its slop extends, and SHALL NOT have another interactive element within that same
distance. Where either condition fails, the control SHALL grow instead.

The distance is derived, not fixed: it is half the difference between 48px and the control's own
size, so it is 12px for a 24px control and 6px for a 36px one.

#### Scenario: Clipped slop is not used

- **WHEN** a control sits closer to an overflow-hiding ancestor than its slop extends
- **THEN** it meets the minimum by growing, because the clipped region would not receive the
  pointer

#### Scenario: Adjacent controls both grow

- **WHEN** two interactive controls sit closer together than their slop would extend
- **THEN** both meet the minimum by growing, so neither one's hit area extends over the other's
  visible box

### Requirement: Code text stays at 16px or larger on coarse pointers

Code entry and code display text SHALL render at 16 CSS pixels or larger on coarse-pointer
devices, so focusing a code field does not trigger the mobile browser's zoom.

#### Scenario: Code input does not trigger mobile zoom

- **WHEN** the receive code input or the pairing code input is focused on a coarse-pointer
  device
- **THEN** its text size is at least 16 CSS pixels and the webview does not zoom
