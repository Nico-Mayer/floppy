## Context

Three surfaces currently ask for files while the Send queue is editable, and all three route
through `addFiles.start()` in `src/lib/components/transfer/send/add-files.svelte.ts`:

- the empty-state mascot card, which is a click target across its whole area,
- the dashed "Add files" tile at the end of the queue grid (`SendQueue.svelte`),
- the floating add button (`AddFilesSheet.svelte`), phone builds only.

`addFiles.start()` already owns the platform branch — `isPhoneChrome` opens the drawer,
everything else calls `send.pickFiles()` directly — and the one re-entry guard for a pick that
has not come back yet. That is why extending the floating button to desktop is a rendering
change and not a logic one.

The archived `2026-08-02-mobile-add-files-fab` change considered exactly the option this change
takes, and rejected it with one sentence: *"the tile is what keeps the grid identical to
desktop."* It also recorded the tile's own defect: *"the tile is the last grid item, so on a
long queue it is off-screen precisely when the user wants it."* Putting the button on desktop
removes the reason and leaves the defect, which is what makes this a reversal of that decision
rather than a contradiction of it.

A press animation on the button was scoped into this change and then dropped from it. The note
under Non-Goals records what that would have cost, so the next attempt starts from what was
already found out rather than from the registry page.

## Goals / Non-Goals

**Goals:**

- One add affordance on the Send screen, in the same place, behaving the same way, on desktop
  and on a phone.
- Delete the affordance with the known reachability defect rather than keeping both.
- The button stays the shared `Button` primitive, so nothing about hit area, focus, variant or
  disabled behaviour is re-litigated by a layout change.

**Non-Goals:**

- Changing what either picker returns, how the queue describes files, the pick-in-flight
  report, or the send flow.
- Touching desktop drag-and-drop, the drop hit-test, or `TransferCard`'s drop-target attribute.
- Removing the empty state's own click target, or hiding the button on the empty shape. The
  doubling there is accepted for now (see Decisions).
- Adding a haptic or a sound to the button. `interaction` names the moments that make feedback
  and adding one is its own decision.
- **A press animation on the button.** Scoped in and then dropped: it is a separate decision
  from where the affordance lives, and it is not a drop-in. What was found while it was in
  scope, so the next attempt does not start over:
  - The `sv-animations` ripple button
    (`https://sv-animations.vercel.app/r/ripple-button.json`) cannot be installed and used as-is.
    It renders its own `<button class="bg-muted text-primary … rounded-lg border-2 px-4 py-2">`
    with no `touch` variant, no `variant`, and no focus ring, so it sits outside `interaction`'s
    "the minimum is enforced by the shared control primitives" rule; and overriding its base
    classes at the call site runs into the tailwind-merge trap that has already produced defects
    here. It would have to **compose** `Button` — ripple as a layer inside it — not replace it.
  - Its `duration="600ms"` prop is a call-site duration, which `interaction`'s one-vocabulary
    requirement forbids. The duration belongs in a named `--animate-*` entry in
    `src/routes/layout.css` beside `bob`/`pop`/`shake`/`arrive`, which also means extending that
    requirement's enumerated list.
  - Its `runed`-backed removal timer parses that same duration a second time in script. Removing
    each ripple on its own `animationend` instead means the number exists once and no package is
    added — `runed` is not currently a dependency.
  - Reduced motion has to be gated in the handler, not by neutralising the keyframe in CSS: an
    `animation: none` never fires `animationend`, so every span it was meant to clean up would
    stay in the document.
  - A keyboard activation reports `clientX`/`clientY` of `0`, which the registry's arithmetic
    turns into a ripple originating off the button's top-left corner. The origin has to fall back
    to the button's centre when `event.detail === 0`.
  - `overflow-hidden`, which the ripple needs, clips the pseudo-element that `touch="slop"` uses
    to expand a small control's hit area — so a rippling control must use `grow`. The floating
    add button already does.

## Decisions

### The tile goes, the button stays, on both platforms

The two candidates differ on one axis that matters: the tile's position depends on how much is
in the queue, the button's does not. A dozen files and the tile is below the fold; the button
is where it always was.

Alternatives considered:

- **Keep the tile, drop the button on phone.** Restores symmetry the other way and costs
  nothing to build, but re-introduces the exact defect the FAB change was written to fix.
- **Move add back into the anchored action zone**, left of the target picker. Fixed position,
  no overlay, no bottom padding — but `2026-08-01-compact-send-target-row` deliberately moved
  add *out* of that zone, and a third control there steals width from a picker that already
  truncates.
- **Put add in the card header.** `TransferCard` is headerless by design; the title lives in
  the shared `PageHeader`. There is no slot, and adding one to reach a per-panel action would
  fork the shared top bar.

### The button keeps floating over content on desktop too, and the queue keeps its bottom padding

An absolutely positioned button over a scrolling grid needs the grid to be able to scroll clear
of it, which is why `SendQueue`'s scroll container carries `pb-20` on phone today. With the
button on every platform that padding stops being conditional. It reserves space below the
tiles that is only visible when the grid is scrolled to the end, so a short queue looks
unchanged.

This is the trade the change makes: "must scroll to reach add" is exchanged for "add sits over
the bottom-trailing corner of the grid". The corner is the cheapest part of the grid to cover —
it is the end of the reading order, and the grid's bottom edge is already masked
(`mask-b-from-…`) where it meets the action zone.

### The button stays on the empty shape, and the doubling is recorded rather than fixed

On the empty shape the mascot card is already a full-area click target, so the button is a
second way to do the same thing, sitting over the illustration. Hiding it there would give the
screen exactly one affordance per shape — but it would also mean the button appears and
disappears between the two idle shapes, and "it is always in that corner" is the property that
makes a floating control findable at all.

Kept for now, deliberately, and written into the spec as an accepted doubling so a later reader
does not file it as an oversight. If it turns out to read as clutter, hiding it on the empty
shape is a one-line change and a scenario swap.

### The button is the one already there

The floating button keeps the `Button` it renders today — `size="icon-lg"`, `touch="grow"`,
`size-14`, primary variant. Nothing about it changes except that it now renders on desktop too.

That is a deliberate narrowing of this change: a press animation was scoped in and taken back
out, because it would have added a UI primitive and a motion-vocabulary entry to what is
otherwise a layout change, and neither has anything to do with where the affordance lives.
What it would take is recorded under Non-Goals so that decision starts from those findings.

### The sheet's commented-out header is deleted, and the drawer gets an `sr-only` title

`AddFilesSheet.svelte` currently carries a commented-out `Drawer.Header`. This change deletes
it — the two rows are self-explanatory and the sheet reads better without a title bar — but a
dialog with no accessible name is a real defect, not a style choice, so a visually hidden
`Drawer.Title` takes its place. The bits-ui dialog primitive also warns when no title is
present.

### The component is renamed to `AddFilesButton.svelte`

"Sheet" was the whole of it when the sheet was the reason it existed. Now the button renders
everywhere and the sheet is the phone-only half of the file, so the name follows the part that
is always there.

## Risks / Trade-offs

- **Two primary-weight circular buttons stack in one corner** — the add button above, Send
  inside the action pill below. With the tile gone the add button is the only add affordance, so
  a misread has no fallback, and dropping the press animation removes the one thing that would
  have given it a distinct signature → the icons already differ (plus vs send/QR), and the gap
  between them plus Send's pill background separates them. Making the add button `secondary` was
  considered and deferred: it is the way to add files on a phone and it is a one-word revert if
  the corner reads as ambiguous on device.
- **A floating action button reads as a mobile pattern on desktop** → accepted as the price of
  one behaviour on both platforms, which is the point of the change. The alternatives that avoid
  it (action zone, card header) were rejected above for concrete structural reasons.
- **The button covers the bottom-trailing tile of the grid** → bottom padding on the scroll
  container, as on phone today, so the last row can always be scrolled clear.
- **Desktop users lose the affordance they know** → the empty state is unchanged and still the
  first thing anyone sees; the tile only existed once files were already queued.

## Migration Plan

Not applicable — no persisted state, no IPC surface, no stored preference. The change is
frontend-only and takes effect on the next build.

## Open Questions

- Should the button drop to `secondary` weight so Send is the corner's only primary? Deferred,
  not unknown: recorded above as a one-word revert, and worth more attention now that the button
  has no press animation to distinguish it.
- Is `size-14` right for a fine pointer, or should the button shrink off a coarse one? Left as
  it is so the button is one size everywhere, which is the change's own premise.
