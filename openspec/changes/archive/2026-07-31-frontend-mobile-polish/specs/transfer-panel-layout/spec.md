## MODIFIED Requirements

### Requirement: The mobile mode switcher is a flush, bottom-anchored segmented control

On mobile the Send/Receive switcher SHALL render as a flush segmented control anchored at
the bottom of the transfer column (thumb reach), without a floating shadow, so it reads as
part of the page rather than a second stacked card. On desktop the switcher SHALL stay at
the top with its current styling.

The switcher SHALL reflect the current mode however that mode was chosen, including by
horizontal swipe across the transfer screen (see `swipe-gestures`). Tapping a segment and the
keyboard shortcuts SHALL continue to work unchanged, and all three routes into a mode change
SHALL produce the same state.

#### Scenario: Mobile switcher is flush and bottom-anchored

- **WHEN** the Transfer screen renders on a phone
- **THEN** the Send/Receive switcher is a flat segmented control at the bottom of the
  column, in thumb reach, with no drop shadow and no floating-card appearance

#### Scenario: Desktop switcher is unchanged

- **WHEN** the Transfer screen renders on desktop
- **THEN** the switcher stays at the top with its current styling

#### Scenario: Switcher follows a swipe

- **WHEN** the user changes mode by swiping across the transfer screen
- **THEN** the switcher's selected segment updates to the new mode

#### Scenario: Every route into a mode change agrees

- **WHEN** the user reaches a mode by tapping a segment, by pressing its shortcut, or by
  swiping
- **THEN** the resulting panel state is identical in all three cases

### Requirement: The Transfer screen dissolves its card chrome on mobile

Below the `sm` breakpoint the Transfer screen SHALL present as one full-bleed surface
rather than a floating card inside padding. The `TransferCard` SHALL drop its border,
shadow, radius, background, and horizontal padding so it becomes the page; the page SHALL
supply exactly one gutter and drop its max-width so content spans the available width; and
the card header SHALL slim to remove desktop-density chrome (the monospace headline row). At
`sm` and above the desktop card presentation SHALL be unchanged. Feature parity SHALL be
preserved: the same send/receive tabs, states, action zone, and file-drop target remain.

The two chrome treatments SHALL be named variants of the card, selected by name, rather than
override classes applied at the call site, so neither treatment can partially drift. The page
gutter itself belongs to the shared page container (see `app-shell`), not to this screen.

#### Scenario: Mobile card is full-bleed

- **WHEN** the Transfer screen renders below the `sm` breakpoint
- **THEN** the transfer surface spans the content width with no card border, shadow,
  radius, or horizontal card padding, with a single page gutter and no centered narrow column

#### Scenario: Desktop card is unchanged

- **WHEN** the Transfer screen renders at `sm` width or above
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

- **WHEN** the Transfer screen is used on a phone
- **THEN** the send/receive switch, every transfer state, the anchored action zone, and
  the file-drop target behave exactly as on desktop

## REMOVED Requirements

### Requirement: Touch devices get minimum 44px targets and 16px code text

**Reason**: Superseded by the app-wide `touch-targets` capability. This requirement was scoped
to the transfer panels only, which left the header menu control, the Devices page, and the
incoming-transfer prompts with no rule at all, and it stated the minimum without saying how a
control satisfies it, so it was met by hand-written classes at individual call sites and drifted
out of compliance.

**Migration**: `touch-targets` carries the same 44px minimum and the same 16px code-text rule,
widened to every interactive control in the app, plus the two mechanisms that satisfy it (grow
for destructive, primary, and navigation controls; hit slop for incidental ones), the
requirement that the shared primitives enforce it rather than call sites, and the clearance and
adjacency constraints that make hit slop safe. No behaviour guaranteed here is lost: the coarse
pointer minimum, the unchanged fine-pointer density, and the 16px code text all appear as
scenarios there.
