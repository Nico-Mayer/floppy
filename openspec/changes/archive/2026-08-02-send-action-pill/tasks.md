## 1. The pill container

- [x] 1.1 In `SendPanel.svelte`, wrap the idle row (target + Send) in the pill: one flex bar,
      `rounded-full`, raised treatment (border + `bg-muted/40` + `shadow-sm`), `h-12`,
      `pointer-coarse:h-14`, `p-1`, with the picker taking the leftover width.
- [x] 1.2 Replace the row's `gap-2` with pill-internal spacing so the target and the button read as
      one bar rather than two boxes with a gap.
- [x] 1.3 Retune `PendingHint`'s `pill` variant to `h-12 pointer-coarse:h-14`, and update its
      comment to name the pill it is matching (it currently names `h-9` and the coarse minimum).
- [x] 1.4 Update the comment block above the grid cell in `SendPanel` so the height coupling
      between the pill and the pending report is written where the next person will read it.
- [x] 1.5 Soften where the pill meets the queue: a short bottom mask fade on the scrolling grid in
      `SendQueue.svelte`, plus `backdrop-blur-sm` and a dimmed border on the pill itself.

## 2. The icon-only Send button

- [x] 2.1 Import `QrCodeIcon` from `@lucide/svelte/icons/qr-code` in `SendPanel.svelte`.
- [x] 2.2 Derive the glyph and the accessible name from the existing `selection` rune: device →
      `SendIcon` + `Send to <name>`, code → `QrCodeIcon` + `Show the code`.
- [x] 2.3 Turn the Send button into `size="icon-lg" touch="grow"` with the derived `aria-label` and
      no visible text; leave `dispatchSend()` untouched.

## 3. Chrome-less target controls

- [x] 3.1 In `SendTargetPicker.svelte`, strip the styled `Select.Trigger`'s chrome via its `class`:
      `border-transparent bg-transparent shadow-none` plus `data-[size=default]:h-full` (the exact
      prefix the vendored file uses for height — a bare `h-full` loses to it).
- [x] 3.2 Strip the native select's chrome from the wrapper with descendant variants
      (`[&>select]:bg-transparent [&>select]:border-transparent [&>select]:h-full`), leaving the
      chevron and the coarse-pointer text size alone.
- [x] 3.3 Leave the pair-entry link as the pill's content in the nothing-trusted state; adjust only
      what the pill's own padding now supplies.
- [x] 3.4 Add a short comment naming why the overrides live here and not as a new vendored variant,
      and why 3.1 repeats the `data-[size=...]` prefix.
- [x] 3.5 Confirm no vendored shadcn file was edited (`git status` shows nothing under
      `src/lib/components/ui/`); if one had to be, mark it `PATCHED` in the file's header comment.

## 4. Verify

- [x] 4.1 Run `npm run check` and the repo's lint/format gate; both clean.
- [x] 4.2 Desktop, both themes, card and bleed chrome: the zone is one bar, the trigger fills its
      height, focus rings are visible on both the trigger and the Send button, and a long device
      name truncates without pushing the button out.
- [x] 4.3 Switch the target between a device and the code target: the glyph and the accessible name
      change in place, and the pill does not resize.
- [x] 4.4 Un-trust the selected device while the picker shows it: the selection falls back to the
      code target and the glyph flips to the QR icon with it.
- [x] 4.5 Start a pick over a full queue: the report replaces the whole pill at the same height and
      shape, and the queue's last row does not move in either direction of the swap.
- [x] 4.6 With nothing trusted: the pair-entry link renders inside the pill and the QR-marked Send
      still sits at the trailing edge.
- [x] 4.7 On a phone build (or a coarse-pointer emulation): the Send button meets the 44px minimum,
      the native picker still opens with the same options, and the pill does not collide with the
      floating add button above it.
- [x] 4.8 At the 500px minimum window width and on a ~315px phone card: one line, no overflow, no
      clipped control.

## 5. Wrap up

- [x] 5.1 Re-read the delta spec's scenarios against what shipped and fix any drift in the spec
      wording before syncing.
- [x] 5.2 Note any deviation from `design.md` (for example, if a vendored variant was needed after
      all) in the change folder so the archive is honest.
