## 1. The add sheet and its button

- [x] 1.1 Add `src/lib/components/transfer/send/AddFilesSheet.svelte`: a `Drawer` holding an
      "Add files" title and two rows, Files and Photo library, plus the floating add button
      that opens it. The whole component renders nothing when `isPhoneChrome` is false.
- [x] 1.2 Wire the Files row: close the drawer, await the close, then call
      `send.pickFiles()` so the native picker is never stacked on a web overlay.
- [x] 1.3 Wire the Photo library row as an operable no-op carrying `StubMark` beside its
      label. Not disabled, not dimmed, focusable in tab order.
- [x] 1.4 Export a shared way to open the sheet so `SendQueue`'s two surfaces can trigger it
      without owning their own drawer state.
- [x] 1.5 Size the button so it meets the 44px minimum by growing, per `interaction`.

## 2. Placement inside the panel

- [x] 2.1 In `SendPanel.svelte`, host the button/sheet inside the card's status zone, only
      while `send.status === 'idle'`, positioned at the trailing bottom corner above the
      anchored action zone.
- [x] 2.2 Confirm the button sits outside the queue's scrolling element so it does not
      scroll with the tiles.
- [x] 2.3 Add bottom padding to the queue's scroll container equal to the button's height
      plus its inset, so the last tile row can be scrolled clear of it.
- [x] 2.4 Check the button against the idle-with-files action row: the target picker and
      Send must both stay fully tappable.

## 3. Copy and the existing add affordances

- [x] 3.1 In `SendQueue.svelte`, branch the empty state's title and description on
      `isPhoneChrome`: phone gets tap wording with no mention of dragging, desktop keeps
      "Drop your files here / or browse" unchanged.
- [x] 3.2 Branch the dashed add tile's supporting line the same way: drop "or drop them" on
      phone.
- [x] 3.3 Route the empty state's click and keydown handlers, and the add tile's click, to
      the shared entry point: the sheet on phone, `send.pickFiles()` directly on desktop.
- [x] 3.4 Leave `TransferCard`'s `dropTarget` and the `+layout.svelte` drag-drop hit-test
      untouched.
- [x] 3.5 Read every new string against the project's copy voice: no em dashes, no
      semicolons, plain words.

## 4. Verify

- [x] 4.1 `npm run check` and the project's lint/format pass clean.
- [ ] 4.2 Desktop `mise run dev`: empty state and add tile still open the picker directly,
      drag-and-drop still appends files, no floating button at any window width including
      below 640px.
- [x] 4.3 Android (`mise run avd:start` then `mise run dev:android`): button present in both
      idle shapes, sheet opens, Files appends to the queue, Photo library does nothing and
      shows the marker, button clears the Send button, button stays put while a long queue
      scrolls, button gone once a send starts.
- [x] 4.4 iOS simulator: same pass as 4.3.
- [x] 4.5 Confirm the safe-area inset and the bottom bar still behave with the button
      present, and that the drawer takes the default overlay layer rather than fighting the
      header or a prompt.
- [x] 4.6 `openspec validate mobile-add-files-fab --strict` passes.
