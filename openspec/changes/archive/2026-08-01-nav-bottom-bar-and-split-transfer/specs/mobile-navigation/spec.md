## ADDED Requirements

### Requirement: Mobile navigation is a bottom bar

Below the navigation's own rail threshold the navigation SHALL be a bottom bar listing every
top-level destination from the single shared destination list. Each item SHALL carry an icon and
a text label, and the item for the current destination SHALL be visually distinct from the rest.
Choosing an item SHALL navigate directly, in one tap, with no intermediate surface to open or
dismiss.

The bar SHALL be present on every route and in every application state, including while a
transfer is running. Navigation SHALL NOT be blocked, deferred, or queued on account of a
running transfer, because leaving a transfer's route does not affect the transfer.

The one exception is the platform's own soft keyboard, which takes its height out of the
layout the bar sits in. While a text field is focused the bar SHALL stand down rather than be
displaced upward to sit above the keys, which is what no platform's own navigation does, and it
SHALL return as soon as the field is blurred. This is occlusion by a system surface, not the
app withholding navigation.

#### Scenario: The bar lists every destination

- **WHEN** the app runs below the rail threshold
- **THEN** a bottom bar renders one labelled item per top-level destination, matching the
  desktop sidebar's list from the same shared source

#### Scenario: One tap navigates

- **WHEN** the user taps a bar item
- **THEN** the app navigates to that destination immediately, with no drawer, sheet, or menu
  opening first

#### Scenario: The current destination is marked

- **WHEN** any destination is showing
- **THEN** that destination's bar item is visually distinct and the others are not

#### Scenario: The bar stays during a transfer

- **WHEN** a send or a receive is in progress
- **THEN** the bar remains visible and every destination stays reachable

#### Scenario: The keyboard does not push the bar up

- **WHEN** the user focuses a text field on a phone and the soft keyboard opens
- **THEN** the bar is not rendered above the keyboard, the focused field stays in view, and
  the bar reappears when the field is blurred

#### Scenario: Leaving a transfer's route does not cancel it

- **WHEN** a transfer is running and the user navigates to another destination
- **THEN** the transfer continues, and returning to its route shows its current state

### Requirement: The bottom bar sits in the layout flow and owns the bottom inset

The bar SHALL be a sibling in the shell's layout flow rather than a fixed overlay, so it
participates in layout instead of floating above it. It SHALL NOT introduce a stacking layer,
and no scroll region SHALL need bottom padding to account for it.

The bar SHALL clear the home indicator and gesture bar by carrying the bottom safe-area inset
itself, and it SHALL be the only surface that does so, so the responsibility cannot be
duplicated or dropped.

#### Scenario: The bar is not an overlay

- **WHEN** the bar renders
- **THEN** content above it is laid out in the remaining space, and no content sits underneath
  the bar requiring compensating padding

#### Scenario: The bar clears the gesture bar

- **WHEN** the app runs on a phone with a home indicator or gesture bar
- **THEN** the bar's items sit above it and no item is obscured or partly unreachable

#### Scenario: The bar does not contend with overlays

- **WHEN** a dialog, sheet, or toast is open
- **THEN** the overlay renders above the bar without the bar needing a stacking-order
  adjustment of its own

### Requirement: Bar items carry counts, preview markers, and transfer state

A bar item SHALL be able to show a count for its destination, a preview marker when that
destination is a preview, and an indication that the destination holds a transfer that is
running or has failed. These indications SHALL be legible together on one item without
truncating each other, and SHALL be quiet enough not to be mistaken for the item's own label.

Because the bar is present on every route, a transfer's running or failed state SHALL be
observable from any destination, not only from the transfer's own route.

#### Scenario: A count shows on its destination

- **WHEN** at least one device is paired
- **THEN** the Devices item shows the count

#### Scenario: A preview destination is marked in the bar

- **WHEN** a destination is declared a preview
- **THEN** its bar item carries the preview marker, and connected destinations do not

#### Scenario: A failure elsewhere is visible

- **WHEN** a send fails while the user is on the Receive destination
- **THEN** the Send item indicates the failure, and opening it shows the failure in full

#### Scenario: A running transfer is visible from anywhere

- **WHEN** a transfer is running and the user is on an unrelated destination
- **THEN** that transfer's item indicates activity

### Requirement: Mobile navigation has no drawer, no menu control, and no edge gesture

There SHALL be no navigation drawer at any width or on any platform. No control SHALL exist
whose purpose is to open or toggle a navigation drawer, and no horizontal screen-edge gesture
SHALL be reserved for navigation.

Consequently no region of the viewport SHALL be reserved for a navigation gesture, and other
horizontal gestures SHALL NOT need to refuse a reserved strip.

#### Scenario: No drawer can be opened

- **WHEN** the app runs at any width
- **THEN** no navigation drawer exists to be opened, by control or by gesture

#### Scenario: The screen edge is not reserved

- **WHEN** a horizontal gesture begins at the very left edge of the screen
- **THEN** the surface under the finger handles it normally, and no navigation responds

#### Scenario: Hardware back does not look for a drawer

- **WHEN** the hardware back button is pressed on Android with no overlay open
- **THEN** the app closes, without any drawer state being consulted

## REMOVED Requirements

### Requirement: Mobile navigation is the sidebar as a left drawer

**Reason**: Replaced by a bottom bar. The drawer could not be fixed in place: the shared drawer
primitive binds its drag handlers to the drawer panel only, so the scrim was drag-dead by
construction; its pointer handling exists only once the drawer is already open, so opening could
never track the finger; and it has no push mode. The drawer's configured width never applied
either, because a variant-prefixed width from the component registry outranked the override.

**Migration**: Navigation is now the bottom bar described above. The same shared destination list
feeds it, so no destination is lost. The desktop sidebar is unchanged above the rail threshold.

### Requirement: The drawer is reachable and dismissable one-handed

**Reason**: There is no drawer to reach or dismiss. A bottom bar is always visible and always in
thumb reach, so reachability needs no affordance and dismissal does not arise.

**Migration**: Every destination is one tap from anywhere. The drag-to-close, flick-to-close,
overlay-tap, and overlay-fade behaviours have no successor because nothing needs closing.

### Requirement: The drawer owns the left edge strip exclusively

**Reason**: The reservation existed only to protect the drawer's opening gesture. With no drawer
there is nothing to protect, and the reservation was a standing tax on every other horizontal
gesture in the app.

**Migration**: The reserved-width definition and the predicate other gestures used to refuse it
are both removed. Row swipes regain the full width of their row.

### Requirement: The drawer clears safe areas as a floating panel

**Reason**: There is no drawer. The bottom safe-area inset is now owned by the bottom bar, and
the top inset by the content region, since mobile has no top app bar.

**Migration**: See "The bottom bar sits in the layout flow and owns the bottom inset" above, and
the safe-area requirement in `app-shell`.

### Requirement: The navigation drawer is one flat surface, not a bottom-sheet card

**Reason**: There is no drawer, so there is no inset floating-card treatment to suppress. The
suppression existed to undo a bottom-sheet look the shared primitive applied to an
edge-anchored panel.

**Migration**: None needed for navigation. Transient bottom sheets elsewhere keep the card look
they already had; that behaviour was never changed by this requirement and is unaffected.
