## 1. The shared connecting view

- [ ] 1.1 Create `src/lib/components/transfer/DeviceConnect.svelte` taking `answered: boolean`, `label: string`, and an optional `hint: string`
- [ ] 1.2 Build it on `TransferComplete.svelte`'s skeleton: `Empty.Root` → `Empty.Header` → `Empty.Media variant="icon"` → `Empty.Title`, keeping the entrance `in:fade={{ duration: normal() }}` the old screens had
- [ ] 1.3 Put the mark in the media frame: `Spinner` while `!answered`, `CheckIcon` with `animate-pop` once `answered`. Both at the frame's own `size-5`, so the swap changes no dimension
- [ ] 1.4 Tint the check with `text-(--tint-fg)` the way `TransferComplete` does, so it takes the panel's accent
- [ ] 1.5 Render `label` as the `Empty.Title` and `hint`, when present, as an `Empty.Description` beneath it
- [ ] 1.6 Carry over the explanatory comments worth keeping from the old screens (why a device transfer shows no code; what `starting` and `waiting` mean for this target) and add one saying why the mark is the state
- [ ] 1.7 Check the spinner's accessible name is not doubled: `Spinner` sets `role="status"` and an `aria-label` of its own, and the label beside it is the thing to announce

## 2. Fold the send screens

- [ ] 2.1 Add the connecting label to `send/labels.ts` beside `sendHeadline`: waiting on the device while unanswered, connecting to it once accepted, both naming the device
- [ ] 2.2 Write the long-wait hint copy there too: what happened and the one thing to check, lowercase, everyday, no em dash
- [ ] 2.3 In `SendPanel.svelte`, collapse the `starting` and `waiting` device branches into one condition so the view is rendered from a single block position — this is what stops the remount
- [ ] 2.4 Keep the code target's two screens intact inside that branch: getting ready on `starting`, the code on `waiting`
- [ ] 2.5 Render `DeviceConnect` with `answered={send.status === 'waiting'}` and the label from the table
- [ ] 2.6 Delete `SendDevice.svelte`
- [ ] 2.7 Verify by hand that accepting no longer replays the entrance fade and the card does not re-lay-out

## 3. Fold the receive screen

- [ ] 3.1 Add the receive connecting label to `receive/labels.ts`, naming the sending device
- [ ] 3.2 Replace `ReceiveDevice` in `ReceivePanel.svelte` with `DeviceConnect` at `answered={false}` — a receive has no answer to wait on, so its mark stays the spinner
- [ ] 3.3 Delete `ReceiveDevice.svelte`
- [ ] 3.4 Delete `DeviceGlyph.svelte` and confirm no caller is left
- [ ] 3.5 Confirm `receive/labels.ts`'s `fileCount` helper still has a caller after the manifest line goes, and remove it if it does not

## 4. The long-wait hint

- [ ] 4.1 Add `noAnswer = $state(false)`, a `#hintTimer`, and a `#clearHint()` to `SendTransfer`, mirroring `ReceiveTransfer`'s `tooSlow` (`transfer-app.svelte.ts:269-355`)
- [ ] 4.2 Start the timer in `beginTrusted()` only, and clear it in `accepted()`, `stop()`, `complete()`, `cancel()`, and `#clearTransfer()`
- [ ] 4.3 Name the delay next to `MISTYPED_CODE_HINT_DELAY` and give it the same 15s value, with a comment saying why a trusted send needs one
- [ ] 4.4 Pass the hint from `SendPanel` only while `starting` and `noAnswer`, so it disappears the moment the answer lands

## 5. Check it on real screens

- [ ] 5.1 `npm run check`, and `npx prettier --write` only the files this change touched
- [ ] 5.2 Desktop: run a real trusted send end to end and watch the accept — the spinner becomes a check in place, the label changes, nothing else moves, then the gauge takes over
- [ ] 5.3 Desktop: confirm the check is not so brief it reads as a flicker on a fast local connection; if it is, note it rather than reinstating a second screen
- [ ] 5.4 Desktop: drag the window wide and narrow, including across the `sm` breakpoint where the card swaps `bleed`↔`card` chrome, and confirm the mark and label stay centred and the card does not look broken at either width
- [ ] 5.5 Phone: the same flow in both directions, confirming a long device name does not wrap the label into a paragraph
- [ ] 5.6 Send to a device with Floppy closed and confirm the hint appears after the delay, the mark and label above it are unchanged, and cancelling still works from there
- [ ] 5.7 With reduced motion on, confirm the spinner and the check still read as the state (the pop degrades, the states do not)
