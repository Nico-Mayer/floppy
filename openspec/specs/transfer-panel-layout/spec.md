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

### Requirement: The receive code input carries an inline clear control

The code input SHALL show an inline clear control whenever it is non-empty, in both the
compact and the regular layout. The app SHALL NOT read the clipboard to pre-fill the code:
the value only ever comes from the user typing or pasting into the field.

#### Scenario: Clear control follows input content

- **WHEN** the receive code input is non-empty in either compact or regular layout
- **THEN** an inline clear control is visible in the input, and activating it empties the field

#### Scenario: Clipboard is never read for the code

- **WHEN** the receive panel mounts, or the window regains focus, with a valid code on the clipboard
- **THEN** the input stays untouched

### Requirement: The Transfer screen dissolves its card chrome on mobile

Below the `sm` breakpoint the Send and Receive screens SHALL each present as one full-bleed
surface rather than a floating card inside padding. The `TransferCard` SHALL drop its border,
shadow, radius, background, and horizontal padding so it becomes the page; the page SHALL
supply exactly one gutter and drop its max-width so content spans the available width. At
`sm` and above the desktop card presentation SHALL be unchanged. Feature parity SHALL be
preserved: every state, the action zone, and the file-drop target remain.

The card header SHALL retain its status headline at every width. The headline was previously
hidden below `sm` because the mode switcher above it and the app bar already said where the user
was; with both removed, the headline is the only sentence describing the current state and SHALL
be shown.

The two chrome treatments SHALL be named variants of the card, selected by name, rather than
override classes applied at the call site, so neither treatment can partially drift. The page
gutter itself belongs to the shared page container (see `app-shell`), not to this screen.

#### Scenario: Mobile card is full-bleed

- **WHEN** either transfer screen renders below the `sm` breakpoint
- **THEN** the transfer surface spans the content width with no card border, shadow,
  radius, or horizontal card padding, with a single page gutter and no centered narrow column

#### Scenario: The status headline shows on mobile

- **WHEN** either transfer screen renders below the `sm` breakpoint in any state
- **THEN** the card's status headline is visible, describing what is currently happening

#### Scenario: Desktop card is unchanged

- **WHEN** either transfer screen renders at `sm` width or above
- **THEN** the `TransferCard` retains its border, shadow, radius, background, and header
  as before

#### Scenario: Chrome is selected by name

- **WHEN** the transfer card renders in either treatment
- **THEN** the treatment is chosen through a named variant of the card, and no call site
  applies chrome-removal classes of its own

#### Scenario: Full-bleed width triggers the roomy panel layouts

- **WHEN** the mobile card is full-bleed and its content width crosses the panels'
  container-query breakpoints
- **THEN** the Send and Receive panels render their regular (roomy) layouts, as already
  defined by the container-query requirement, without any mobile-specific panel code

#### Scenario: Feature parity holds on mobile

- **WHEN** either transfer screen is used on a phone
- **THEN** every transfer state, the anchored action zone, and the file-drop target behave
  exactly as on desktop

### Requirement: Send and Receive are separate destinations

Send and Receive SHALL be two top-level destinations, each with its own route, rather than two
modes of one screen. There SHALL be no in-screen control for switching between them: switching is
navigation, performed through the bottom bar, the desktop sidebar, or a keyboard shortcut.

There SHALL NOT be an application state field that selects which of the two is showing. The
current route is the only representation of that choice, so the two cannot disagree.

Both screens SHALL keep their state across navigation away and back, because the transfer state
and its event streams belong to the shell rather than to either route.

#### Scenario: Each is its own destination

- **WHEN** the user opens the app
- **THEN** Send and Receive appear as separate destinations in the navigation, each reachable
  directly

#### Scenario: No in-screen switcher exists

- **WHEN** either screen renders at any width
- **THEN** it contains no segmented control, tab strip, or other control for switching to the
  other one

#### Scenario: Switching is navigation

- **WHEN** the user switches from Send to Receive by any means
- **THEN** the app navigates to the Receive destination, and the navigation surface reflects it

#### Scenario: State survives leaving and returning

- **WHEN** a transfer is in progress, the user navigates away, and later returns to that screen
- **THEN** the screen shows the transfer's current state, having lost nothing

#### Scenario: The app opens on Send

- **WHEN** the app is launched with no destination specified
- **THEN** it lands on the Send destination

### Requirement: Each transfer screen owns its own errors

A transfer failure SHALL be presented on the screen of the side that failed, and SHALL NOT be
presented on the other. A send failure and a receive failure SHALL be able to exist at once
without either replacing the other.

Because a failure can arrive while the user is on another destination, the failed side SHALL be
indicated in the navigation, so the failure is discoverable without knowing which screen to
check.

#### Scenario: A failure appears on its own screen

- **WHEN** a send fails
- **THEN** the failure is described on the Send screen, and the Receive screen shows no error

#### Scenario: Two failures coexist

- **WHEN** a send has failed and a receive then fails
- **THEN** each screen shows its own failure and neither clears the other

#### Scenario: A failure elsewhere is announced in navigation

- **WHEN** a transfer fails while the user is on a different destination
- **THEN** the failed side's navigation item indicates it, and opening that destination shows
  the failure in full

#### Scenario: Dismissing one leaves the other

- **WHEN** the user dismisses the failure on one screen
- **THEN** the other screen's failure is untouched

