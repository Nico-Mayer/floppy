# Tasks: picker-loading-state

> **Closed on device 2026-08-02.** Verified on iOS (§8) and desktop (§9.1), and the flicker
> question (§7.1) was settled by looking: no delay gate was needed. Two items stay unticked on
> purpose — **7.2** is conditional on a delay that was never added, and **9.2** is Android, which
> had no device available at any point. Neither is an oversight; see the notes on each.
>
> **Revised twice, and the record is kept rather than tidied away.** §2 built the busy state onto
> the two queue surfaces; §4 moved it to the card header when the add tile turned out to scroll
> out of view exactly while the wait was on. §5 is what shipped: the anchored action zone, which
> is both louder than a 16px spinner in the header and *is* the Send slot, so an incomplete
> selection cannot be sent because there is no button, not because a button refuses. §5 also
> collapsed the per-surface guards into one. §10 then split the report per idle shape rather than
> forcing one placement on both: the action zone with files queued, under the mascot without.
> Final diff is four files; `AddFilesSheet`, `TransferCard` and `labels.ts` stay untouched.

## 1. Expose the picking flag

- [x] 1.1 In `src/lib/transfer-app.svelte.ts`, turn the private `#picking` guard into reactive
      state with a public read-only getter (`$state` field plus `get picking()`), keeping the
      two writes in `#pick()` exactly where they are so the guard behaviour is unchanged
- [x] 1.2 Confirm the `finally` block still clears it on every exit — resolved, cancelled
      (`null` on iOS/desktop), and rejected (Android) — so the busy state can never stick
      — all three exits reach it. `addPaths()`/`Describe` sits *inside* the try, so the flag
      also covers resolving the result into queue entries, which is what the spec asks for
      and is where Android's per-file copies land

## 2. The busy surfaces — built, then dropped by §4

- [x] 2.1 Branch the empty state on `send.picking`: mascot and copy swapped for a spinner and
      one line — built, reverted, then brought back by §10 in a corrected form. The idea was
      right for this shape all along; replacing the *mascot* was the wrong part, and so was
      assuming both idle shapes wanted the same treatment
- [x] 2.2 Branch the dashed add tile on `send.picking` — built, then reverted. The tile scrolls
      out of view at the end of a long queue, which is where the eye is not after a pick
- [x] 2.3 Leave the queued tiles alone — no overlay, no dimming, no scroll lock. Still true
- [x] 2.4 Settle the copy. One string has to serve both pickers, so it cannot say "photos" or
      "files": something like **getting them ready**. Lowercase, no em dash, everyday words
      (see the UI copy voice in `openspec/config.yaml`)
      → first **getting them ready**, then **getting files ready** in 6.1. The dodge was the
      mistake: a photo is a file, so naming files covers both pickers without naming neither

## 3. The floating add button

- [x] 3.1 Disable the floating button while `send.picking` is true — superseded by 5.2, which
      guards all three surfaces at their shared entry point instead
- [x] 3.2 Check the disabled state reads as a button rather than looking broken — moot once the
      `disabled` attribute came off in 5.2. The button now looks normal and quietly does nothing,
      which the action zone below it has already explained

## 4. The busy state moves to the card header — built, then dropped by §5

- [x] 4.1 A `busy` prop on `TransferCard.svelte` rendering a spinner beside the card title
      — built, then reverted: too subtle at `size-4`, and it left Send pressable over a queue
      that was still filling
- [x] 4.2 `sendHeadline()` gains a `picking` argument — built, then reverted. The status line is
      mono, 10px and uppercase, which is the quietest text in the card

## 5. The report moves to the action zone

- [x] 5.1 In `SendPanel.svelte`, add a first branch to the `actions` snippet for
      `send.status === 'idle' && send.picking`: a full-width tinted bar with a spinner and a
      line, using the card's `--tint` so it reads as the send accent. Restructured by 6.2 into
      a nested branch under one idle condition, so the two shapes can share a slot
- [x] 5.2 Collapse the per-surface guards into one early return in `addFiles.start()`. It cannot
      live in `transfer-app`: the `#picking` check there refuses a second *pick*, but on a phone
      `start()` opens the drawer, which that check never sees
- [x] 5.3 Revert `SendQueue.svelte`, `AddFilesSheet.svelte`, `TransferCard.svelte` and
      `labels.ts` to their original state — 5.2 covers what their local guards were for.
      `SendQueue` comes back in §10, as the empty state's reporting surface rather than for a
      guard; the other three stay untouched
- [x] 5.4 Not a `Button`: nothing in the bar is pressable, and `disabled:opacity-50` would make
      the busy state quieter than the row it replaced rather than louder
- [x] 5.5 `role="status"` on the bar and `aria-hidden` on the spinner, so the sentence is
      announced once with no stray "Loading" beside it
- [x] 5.6 Update the `transfer-panel-layout` delta: the ADDED requirement is rewritten around the
      action zone, and *The Send idle action zone is a single row* is MODIFIED, because as
      written it says the idle zone is target-plus-Send whenever files are queued and that is
      now the resting shape rather than the only one

## 6. Wording and the swap

- [x] 6.1 **getting them ready** → **getting files ready**. One string serves both pickers, and
      a photo is a file, so naming files covers the photo case instead of dodging both
- [x] 6.2 Crossfade the bar and the send row instead of cutting between them. Both branches move
      under one `{#if send.status === 'idle' && (send.picking || send.files.length > 0)}` and
      into a single grid cell (`grid *:col-start-1 *:row-start-1`), with `transition:fade` on
      each
- [x] 6.3 The grid cell is what makes `transition:` safe here. An outgoing element stays in the
      DOM until its transition ends, and as two siblings of the flex column that would stack
      them for the whole crossfade and push the queue up a row. Stacked in one cell they overlap
- [x] 6.4 Give the bar the Send button's own height numbers — `h-9` plus `pointer-coarse:min-h-11`
      — so the shared cell is the same height in both shapes and the crossfade moves nothing.
      It was `py-2.5` (≈40px) against the button's 36px, which would have jumped
- [x] 6.5 Reduced motion needs no branch: `fast()` already returns 0 for it, which satisfies
      *Decorative motion collapses under reduced-motion* in the `interaction` spec, so no delta
      there

## 7. Flicker

- [x] 7.1 Decide whether a short pick (five photos, a single file) flashes the bar badly enough
      to matter. If it does, gate it behind a small delay (~150ms) so a fast pick never shows it.
      Do not add the delay speculatively — look first
      → checked on device. No gate added: the fast case does not read as a glitch
- [ ] 7.2 If a delay is added, make sure it cannot outlive the pick: a pick that resolves inside
      the delay must never show the bar at all
      → **not applicable.** Conditional on 7.1 adding a delay, and it did not. Left unchecked
      rather than ticked, because nothing was built for it to be true of
- [x] 7.3 Watch for a layout jump on the empty-queue path. The action zone collapses when the
      snippet renders nothing (`[&:not(:has(*))]:hidden`), so with nothing queued the bar makes
      the zone *appear*, shrinking the empty state under it. Check whether that reads as the bar
      arriving or as the page lurching
      → settled by design instead of by looking: §10 splits the report per shape, so an empty
      queue never renders the bar and the zone never appears

## 10. Split the report per idle shape

- [x] 10.1 Empty state: put a spinner and the line under the mascot, in place of the invitation
      copy, in `SendQueue.svelte`. The mascot stays — this sits below it, which is where the eye
      already is on that screen
- [x] 10.2 Narrow the action-zone branch back to `send.status === 'idle' && send.files.length > 0`,
      so a pick over an empty queue no longer renders the bar at all. This is what closes 7.3
- [x] 10.3 Same grid-cell crossfade as §6 for the empty state's two copy shapes, for the same
      reason: `Empty.Header` is a flex column, and two siblings mid-transition would grow it
- [x] 10.4 `role="status"` and `aria-hidden` on the spinner here too, matching 5.5
- [x] 10.5 Note what this reverses: §2.1 built almost exactly this and §4/§5 dropped it. The
      reason it was dropped never applied to the empty state — it was the *add tile* that
      scrolls out of view. §2.1's mistake was replacing the mascot rather than sitting under it,
      and treating both shapes the same
- [x] 10.6 Update the delta: the ADDED requirement now names a placement per shape rather than
      one placement, and the "queue surfaces do not change shape" scenario narrows to the add
      tile and the add button, since the empty state is now a reporting surface

## 8. Verify on iOS

- [x] 8.1 Pick 50+ photos with an empty queue: the spinner and line appear under the mascot as
      soon as the picker sheet dismisses, hold for the whole wait, and are replaced by the full
      grid. The action zone stays collapsed throughout — no bar, no zone appearing
- [x] 8.2 Repeat with files already queued: the target picker and Send button are gone for the
      duration, the bar is in their place, and the queued tiles stay visible
- [x] 8.3 Scroll a long queue while a pick is in flight: the bar stays put, which is the whole
      reason it is in the anchored zone
- [x] 8.4 Cancel the picker: the target-plus-Send row comes straight back, no error, queue
      untouched
- [x] 8.5 Tap the floating add button, the empty state, and the add tile during a long pick:
      nothing stacks, no second picker or sheet opens, and nothing changes shape
- [x] 8.6 Pick five photos: confirm the fast case does not look like a glitch (settles 7.1)
- [x] 8.7 Confirm the bar's contrast holds in both light and dark: it is `text-(--tint)` on
      `bg-(--tint)/10`, which has not been used together anywhere else in the app
- [x] 8.8 Watch the crossfade both ways over a populated queue. Nothing should move: not the
      zone's height, not the queue above it. A jump here means the two shapes are not the same
      height after all, which is what 6.4 was for
- [x] 8.9 Watch the empty state's crossfade both ways. The two copy shapes are not the same
      height (title-plus-description against spinner-plus-line), so the shared cell holds the
      taller one — check the mascot above does not shuffle as they swap
- [x] 8.10 Turn reduced motion on and repeat both: the swaps are instant and nothing else changes

## 9. Verify elsewhere

- [x] 9.1 Desktop: open the file picker, browse for a while, cancel. The bar is hidden behind the
      native modal the whole time and clears on close, so nothing wrong is ever visible
- [ ] 9.2 Android, when a device is available: the same wait exists but sits in `describe`'s
      per-file `materialize()` copies rather than in `open()`, and the same bar should cover it.
      Not blocking — no Android device to test on right now
      → **still open, deferred.** No Android device was available at any point in this change, so
      this one is genuinely unverified rather than merely unticked. The Android path differs from
      the verified iOS one in where the wait lives (`describe`'s serial byte copies, not the
      picker's `DispatchGroup`), so iOS passing is not evidence for it
