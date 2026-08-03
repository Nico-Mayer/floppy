## Why

The Send screen offers a different number of ways to add files depending on the platform:
desktop has one (the dashed tile at the end of the queue grid), a phone has two (that tile
plus the floating add button). The tile is the one with the flaw — it is the *last* grid
item, so on a long queue it has scrolled out of view exactly when the user wants it — and the
only reason it survived the change that introduced the floating button was to keep the grid
identical to desktop. Giving desktop the floating button removes that reason, so the screen
can settle on one affordance that behaves the same everywhere.

## What Changes

- The floating add button becomes the Send screen's add affordance on **every** platform, not
  only phone builds. On desktop it opens the file picker directly; on a phone it opens the
  existing files/photos sheet. That branch already lives in `addFiles.start()`, so both
  platforms keep one entry point.
- **BREAKING (UI)** The dashed "Add files" tile is removed from the queue grid on every
  platform. The grid becomes tiles only.
- The floating button stays in both idle shapes, including the empty state, where the mascot
  card is itself a click target. The doubling there is accepted deliberately for now: the
  button's position is what makes it findable, and it should not move or vanish between the
  two idle shapes.
- The button stays the shared `Button` primitive it is today, unchanged. Giving it a press
  animation was considered and dropped from this change: it is a separate decision from where
  the affordance lives, and folding it in here would mean a new UI primitive and a new entry in
  the motion vocabulary riding along with a layout change.
- The queue's scroll container keeps its bottom padding on every platform now that the button
  floats over the grid everywhere, so the last row can always be scrolled clear of it.
- No change to what the queue accepts, to either picker, to the pick-in-flight report, to
  drag-and-drop, or to the send flow.

## Capabilities

### New Capabilities

None. This is a behaviour change to an existing screen.

### Modified Capabilities

- `transfer-panel-layout`: the floating add button stops being phone-only and becomes the one
  add affordance on every platform; the dashed add tile is removed, which retires the
  requirements and scenarios written about it (its phone copy, its routing through the sheet,
  its behaviour during a pick).

## Impact

- `src/lib/components/transfer/send/SendQueue.svelte` — the dashed add tile and its platform
  copy branch are deleted; the scroll container's bottom padding stops being phone-only.
- `src/lib/components/transfer/send/AddFilesSheet.svelte` — renamed to `AddFilesButton.svelte`;
  the button renders on every platform, only the drawer stays behind `isPhoneChrome`.
- `src/lib/components/transfer/send/add-files.svelte.ts` — comment only; the three-caller note
  becomes a two-caller note. No logic change: the platform branch it already owns is what
  makes the desktop button work.
- No new UI primitive, no new keyframe, no CSS change, no new npm dependency.
- No Rust, IPC, broker, or capability-manifest change.
