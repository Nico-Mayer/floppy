# Implementation notes

## Deviations from design.md

- **PendingHint's pill rounding.** The design only pinned the report's height. Its `rounded-4xl`
  (32px) is not fully round at 48px tall, and the send pill is `rounded-full`, so the report went
  `rounded-full` too. Without it the two shapes differ mid-crossfade, which is the thing the
  requirement asks to avoid.
- **Pill-internal spacing** landed as `gap-1`; the design left the number open. The picker's own
  `px-3` supplies the rest.
- **Added after a look at it (task 1.5).** The pill's top edge met the queue's last row of tile
  corners as a flat collision. The grid now carries `mask-b-from-[calc(100%-0.5rem)]` (an 8px fade
  at its bottom, one grid gap's worth) and the pill got `backdrop-blur-sm` and `border-border/60`.
  The blur only pays off where something translucent sits behind the bar, so on a plain card it is
  the mask doing the work. Neither touches a requirement.

Everything else went as designed: no vendored shadcn file was touched, the chrome comes off through
call-site overrides in `SendTargetPicker`, and the `data-[size=default]:h-full` prefix repeat was in
fact needed.

## Verification status

Ran and green:

- `npm run check` — 5052 files, 0 errors, 0 warnings.
- `npm run lint` (prettier + eslint) — clean.
- `npm run build` — clean.

Walked by hand and confirmed by the author (tasks 4.2 to 4.8):

- Both themes, card and bleed chrome, focus rings, long-name truncation.
- Glyph and accessible-name swap when the target changes, and on an un-trust fallback.
- The pick-in-flight report standing in the pill's slot without moving the queue.
- The nothing-trusted shape with the pair-entry link inside the pill.
- Coarse-pointer hit area, the native picker, and clearance from the floating add button.
- The 500px window and the ~315px phone card.
