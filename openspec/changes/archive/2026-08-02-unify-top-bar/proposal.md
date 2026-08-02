# Proposal: unify-top-bar

## Why

On a phone every screen wears a different top: Devices, Settings, and Account render the
shared page heading, while Send and Receive skip it and carry their title inside the transfer
card's own header, next to a status badge user tests say nobody reads. Two header systems
means double the vertical chrome on the screens people use most, and no single place to make
the top of the app smaller. One shared top bar, compact on phones, fixes both.

## What Changes

- Every destination, Send and Receive included, renders the one shared heading component.
  The transfer card loses its own header row (title, tint dot, status headline, badge).
  **BREAKING** for the app-shell allowance that a route may skip the heading because its
  card carries the title, and for the transfer-panel-layout promise that the desktop card
  header is unchanged.
- The heading grows two small slots so the transfer screens lose nothing: an accent dot
  before the title, and a live status line (the mono headline, e.g. "sending", "waiting for
  pickup") on the title row. The large-transfer warning moves into the heading's existing
  action slot.
- The status badge is removed rather than replaced: user tests showed nobody pays attention
  to it, and everything it said is already said better elsewhere (the percent by the
  progress display, the queue size by the file list, the state by the headline).
- The top bar gets smaller on phones: compact title scale and the description line hidden
  below the `sm` breakpoint, so the bar is one row. Desktop keeps its current title and
  description sizes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: the "page headings come from one shared pattern" requirement is replaced —
  the shared heading becomes the one top bar every destination renders, with the accent
  dot and status slots, compact on phones, description hidden on phones.
- `transfer-panel-layout`: the card-chrome requirement is replaced — the transfer surface
  carries no header of its own at any width; the status headline lives in the shared top
  bar; the badge and its label functions are gone; full-bleed behavior below `sm` is
  unchanged.

## Impact

- `src/lib/components/shell/PageHeader.svelte`: accent dot, status slot, compact phone
  scale, description hidden below `sm`.
- `src/routes/send/+page.svelte`, `src/routes/receive/+page.svelte`: render the shared
  heading with live status; pass the warning as the action.
- `src/lib/components/transfer/TransferCard.svelte`: header row deleted (title, headline,
  badge, alert slot); card becomes a plain surface.
- `src/lib/components/transfer/send/SendPanel.svelte`, `receive/ReceivePanel.svelte`: stop
  computing badges; hand headline and warning up to the page.
- `src/lib/components/transfer/send/labels.ts`, `receive/labels.ts`: `sendBadge` /
  `receiveBadge` deleted; headline functions stay.
- Specs: two replaced requirements (REMOVED + ADDED per the archive tooling's
  no-dropped-scenario rule).
