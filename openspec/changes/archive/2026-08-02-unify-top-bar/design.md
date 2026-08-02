# Design: unify-top-bar

## Context

Two header systems exist today. Devices, Settings, and Account use `PageHeader` (2xl title,
description line, optional trailing action). Send and Receive render no page heading; their
`TransferCard` header carries the title with a tint dot, a mono status headline, an optional
warning icon, and an outline badge (`sendBadge`/`receiveBadge`). User tests: the badge draws
no attention. The badge's content is redundant — `TransferProgress` paints the percent large,
`SendQueue` shows count and size, the headline states the phase.

`transfer-panel-layout` currently promises the desktop card header is unchanged and that the
headline lives in the card; `app-shell` currently allows the transfer route to skip the
heading *because* the card carries the title. Both promises are what this change replaces.

## Goals / Non-Goals

**Goals:**

- One heading component rendered by all five destinations at every width.
- A visibly smaller top on phones: one row, compact title, no description line.
- Badge gone; nothing of value lost (headline, percent, queue size all remain elsewhere).

**Non-Goals:**

- Touching the bottom bar or the desktop window header (`AppHeader`).
- Changing desktop title/description sizes on the reading pages.
- Any change to transfer behavior, states, or the two-zone card structure.

## Decisions

**1. The card header dies entirely; the page heading absorbs it.** `TransferCard` drops its
`Card.Header` (title, dot, headline, badge, alert) at every width, not only on phones. A
phone-only removal would leave desktop with two stacked titles ("Send" in the page heading
and "Send" in the card) or force the transfer pages to keep skipping the heading, which is
the disunity being fixed. Desktop gains the same header rhythm as every other page; the card
becomes a plain surface. `title`, `headline`, `badge`, and `alert` props are deleted from
`TransferCard`.

**2. `PageHeader` grows two slots instead of the pages growing custom rows.**

- `accent?: 'send' | 'receive'` renders the small tint dot before the title, same custom
  properties as the card used (`--send` / `--receive` tokens).
- `status?: string` renders the mono, lowercase, tracking-widest line on the title row,
  after the title and before the action, `aria-live="polite"` so a state change is
  announced. It is a string, not a snippet: every current use is text, and a string keeps
  the reactive plumbing trivial (`status={headline}`).

Rejected: a generic snippet slot per page (re-opens per-page drift, which is the bug).

**3. Compact scale is a `max-sm:` variant inside `PageHeader`, not a prop.** Below `sm` the
title renders `text-lg` and the description is not rendered; at `sm`+ everything stays as
today (2xl + description). Width, not platform: a narrow desktop window benefits identically,
and this matches how `isNarrow`/`max-sm:` is used everywhere else in the shell.

**4. Badge removed, not swapped.** `sendBadge`/`receiveBadge` and the `Badge` in the card
header are deleted. The one state whose badge said something unique mid-transfer (percent)
is already the biggest number on the screen via `TransferProgress`. If user tests later want
a glanceable token up top, the status slot is where it would go — no dead structure is kept
for it.

**5. The large-transfer warning becomes the Send heading's action.** The heading already owns
one trailing action slot (Devices uses it for the QR button). Send passes the warning
icon-with-tooltip snippet there in the states that had it; Receive passes nothing. The
`alert` prop on the card goes away with the header.

**6. Panels hand state up instead of rendering chrome.** `SendPanel`/`ReceivePanel` currently
compute `headline` internally. The pages need it now, so the derivation moves up to
`+page.svelte` (both already import `app` for `TransferError`). The label functions stay in
`labels.ts`, minus the badge functions.

**7. Spec surgery is REMOVED + ADDED, then reordered by hand at archive.** Both replaced
requirements change scenario sets, and `openspec archive` refuses a MODIFIED block that
drops a scenario. Known consequence: after sync, the re-added blocks are appended at the end
of the main spec and get moved back into reading order manually.

## Risks / Trade-offs

- [Desktop card loses its title row, which also carried the drop-target tint area's visual
  anchor] → the page heading directly above provides the same anchor; the drop-target ring
  and tint are on the card body and are unchanged.
- [Status line on the title row could collide with a long title on tiny screens] → title
  truncates (existing rule), status is `shrink-0` and short by construction (two or three
  words, lowercase); worst case the title truncates earlier, never the status.
- [Removing the badge deletes the only glanceable "% " when the progress zone is scrolled
  out of view] → the transfer screens do not scroll their status zone out of view; the
  progress display is always within the viewport-sized card.
- [`aria-live` on a rapidly changing status could chatter] → the headline changes only on
  phase transitions, not per progress tick; percent is not in the status line.

## Open Questions

None.
