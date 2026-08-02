## Why

Picking a large batch from the photo library on iOS takes about four seconds for 50+ photos,
and for all four of them the app looks like nothing happened. The picker sheet is already
gone, the Send screen is back, and the queue is still empty. Then every tile appears at once.

That shape is not a mystery, and it is not the thumbnails. `tauri-plugin-dialog` 2.7.2
(`ios/Sources/FilePickerController.swift:183`) dismisses the picker **first**, then loads each
item's file representation into a `DispatchGroup`, and only fires `.selected(urls)` from
`dispatchGroup.notify` once the last one lands. Nothing is reported until everything is done —
the barrier is all-or-nothing by construction. Each item costs a HEIC decode, a JPEG encode
(iOS converts under the default representation mode; see the `send-photo-library` design), and
a copy into the app sandbox, so the wait scales with the number picked. Five is instant, fifty
is four seconds.

The thumbnail path is provably not the cause. `preview.rs:113` serializes decodes behind a
global mutex on mobile, so if thumbnails were the cost the tiles would fill in strictly one at
a time. They do not; they all arrive together, which is the `notify` barrier and only the
`notify` barrier.

So the whole wait happens inside an awaited `open()` in `transfer-app.svelte.ts:109`, with the
app on screen, idle, and silent. The bug is not the four seconds. The bug is that the app says
nothing for four seconds.

## What Changes

- While a native picker call is in flight, the Send panel says so, with a spinner and the line
  `getting files ready` — files, not photos, because one string serves both pickers and a photo
  is a file anyway.
- **Where** it says so follows which idle shape is on screen. The two shapes have different
  problems and one placement does not serve both:
  - **Files already queued** → the anchored **action zone**, as a tinted full-width bar in the
    place of the send target and the Send button. It stands where Send stands, so it **blocks
    the send by replacing it** — over an incomplete selection there is no Send button to press,
    rather than a disabled one that has to be kept in step with something. The zone is anchored
    and does not scroll, so a long queue cannot carry the report out of view.
  - **Nothing queued** → inside the empty state, under the mascot, in place of that surface's
    invitation copy. There is no Send to block on this shape, and no action zone either: it
    collapses when it holds nothing, so putting the report there would make an absent zone
    appear and shove the card above it. Under the mascot is where the eye already is here.
- Each report **crossfades in place** with the copy it replaces, the two sharing one grid cell
  so the outgoing shape can stay in the DOM for the length of the transition without stacking
  below the incoming one and moving everything around it. In the action zone the bar carries the
  Send button's own `h-9`, so the shared cell is one height. The motion is decorative, so
  `fast()` collapses it to nothing under reduced motion.
- The add tile and the floating add button do not change shape. They keep their copy and their
  size and simply refuse to start a second pick — the report is already on screen saying why
  nothing happened, and the add tile in particular can be scrolled out of view, which is what
  ruled it out as a place to report from.
- One guard for all three of them, in `addFiles.start()` — the chokepoint they already route
  through — rather than repeated on each. It cannot live in `transfer-app` instead: the
  `#picking` check there refuses a second *pick*, but on a phone `start()` opens the drawer,
  which that check never sees.
- The indicator is **indeterminate** — a spinner and one line, no count and no progress bar.
  This is forced: the plugin reports nothing until it reports everything, so the number of
  items picked is genuinely unknown until the wait is over. A count would have to be invented.
- Not a button. Nothing in the bar is pressable, and a dimmed disabled button would be quieter
  than the row it replaced rather than louder. Both reports carry `role="status"` with
  `aria-hidden` on the spinner, so the sentence is announced once with no stray "Loading".
- Nothing about the picker, the transcode, or the thumbnails changes. No plugin fork, no Rust
  change, no IPC change. This is a honesty fix on an unavoidable wait, not a speed-up.

## Alternatives considered

- **Collapse large selections into one grouped tile** (the idea that started this). It would
  cut thumbnail decodes from N to ~3, but thumbnail decoding is not where the four seconds go.
  All 50 items still transcode inside `open()` before the grid exists, so the wait would be
  unchanged and the queue would lose per-file review and removal. Shelved. Worth revisiting
  only if the thumbnail queue ever becomes the visible cost, which would look like tiles
  filling in one by one — a different symptom from the one being fixed here.
- **Fork the plugin to set `preferredAssetRepresentationMode = .current`.** Removes the
  transcode, so it removes most of the four seconds. Ruled out already in `send-photo-library`
  for the same reasons, and it would hand back HEIC, which the app cannot decode for a preview,
  so every tile would lose its thumbnail.
- **Speed up the thumbnail path** (JPEG instead of PNG encode, a disk cache, scaled decode).
  All real wins, none of them this bug. Separate change if it is ever worth it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transfer-panel-layout`: adds a requirement that the Send panel reports a picker call still in
  flight — in the anchored action zone with files queued, under the mascot without — that the
  Send control is absent while it does, that the add tile and add button do not change shape,
  and that the report claims no count or progress.
  It also **modifies** *The Send idle action zone is a single row*, which as written says the
  idle zone is the target plus Send whenever files are queued. That is now the resting shape
  rather than the only one, so the requirement gains the pending case and its first scenario
  gains "and no pick in flight". The add-sheet and add-button requirements are untouched.

`preview-markers` needs no delta: this is a working surface gaining feedback, not an
unfinished one.

## Impact

Four files, and no new component:

- `src/lib/transfer-app.svelte.ts` — `#picking` becomes reactive and readable from outside
  (`$state` plus a getter). Its two writes in `#pick()` stay where they are.
- `src/lib/components/transfer/send/add-files.svelte.ts` — `start()` returns early while a pick
  is in flight. This is the whole guard, for all three surfaces.
- `src/lib/components/transfer/send/SendPanel.svelte` — the idle `actions` branch becomes two
  shapes sharing a grid cell: the bar and the existing send row.
- `src/lib/components/transfer/send/SendQueue.svelte` — the empty state's copy block becomes two
  shapes sharing a grid cell, the mascot above it unchanged.

`AddFilesSheet.svelte`, `TransferCard.svelte` and `labels.ts` are untouched.
- No Rust change, no `bindings.ts` regeneration, no new dependency.
- Known cosmetic edge: on desktop and Android the native picker covers the app for the whole
  browse, so the busy state sits behind a modal the user cannot see past. It resolves the
  moment the picker closes, so it is never visibly wrong — but it does mean the state tracks
  "a picker is open", not only "the app is working".
