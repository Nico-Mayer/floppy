## 1. The shared connecting view

- [x] 1.1 Create `src/lib/components/transfer/DeviceConnect.svelte` taking `answered: boolean`, `label: string`, and an optional `hint: string`
- [x] 1.2 Build it on `TransferComplete.svelte`'s skeleton: `Empty.Root` → `Empty.Header` → `Empty.Media variant="icon"` → the label, keeping the entrance `in:fade={{ duration: normal() }}` the old screens had
- [x] 1.3 Put the mark in the media frame at a step up from the completion screen's (`size-16` frame, `size-8` glyph): `Spinner size="panel"` while `!answered`, `CheckIcon` with `animate-pop` once `answered`. Same glyph size either way, so the swap changes no dimension
- [x] 1.4 Tint the check with `text-(--tint-fg)` the way `TransferComplete` does, so it takes the panel's accent
- [x] 1.5 Render `label` as an `Empty.Description`, not an `Empty.Title` — the mark is the message and a bold heading would compete with it — and `hint`, when present, as a second `text-xs` one beneath
- [x] 1.6 Carry over the explanatory comments worth keeping from the old screens (why a device transfer shows no code; what `starting` and `waiting` mean for this target) and add one saying why the mark is the state
- [x] 1.7 Check the spinner's accessible name is not doubled: `Spinner` sets `role="status"` and an `aria-label` of its own, and the label beside it is the thing to announce

## 2. Fold the send screens

- [x] 2.1 Add the connecting label to `send/labels.ts` beside `sendHeadline`: waiting on the device while unanswered, connecting to it once accepted, both naming the device
- [x] 2.2 Write the long-wait hint copy there too: the one thing to check and nothing else, since the label above already says who we are waiting for. Lowercase, everyday, no em dash
- [x] 2.3 In `SendPanel.svelte`, collapse the `starting` and `waiting` device branches into one condition so the view is rendered from a single block position — this is what stops the remount
- [x] 2.4 Keep the code target's two screens intact inside that branch: getting ready on `starting`, the code on `waiting`
- [x] 2.5 Render `DeviceConnect` with `answered={send.status === 'waiting'}` and the label from the table
- [x] 2.6 Delete `SendDevice.svelte`
- [x] 2.7 Verify by hand that accepting no longer replays the entrance fade and the card does not re-lay-out

## 3. Fold the receive screen

- [x] 3.1 Add the receive connecting label to `receive/labels.ts`, naming the sending device
- [x] 3.2 Replace `ReceiveDevice` in `ReceivePanel.svelte` with `DeviceConnect` at `answered={false}` — a receive has no answer to wait on, so its mark stays the spinner
- [x] 3.3 Delete `ReceiveDevice.svelte`
- [x] 3.4 Delete `DeviceGlyph.svelte` and confirm no caller is left
- [x] 3.5 Confirm `receive/labels.ts`'s `fileCount` helper still has a caller after the manifest line goes, and remove it if it does not

## 4. The long-wait hint

- [x] 4.1 Add `noAnswer = $state(false)`, a `#hintTimer`, and a `#clearHint()` to `SendTransfer`, mirroring `ReceiveTransfer`'s `tooSlow` (`transfer-app.svelte.ts:269-355`)
- [x] 4.2 Start the timer in `beginTrusted()` only, and clear it in `accepted()`, `stop()`, `complete()`, `cancel()`, and `#clearTransfer()`
- [x] 4.3 Name the delay next to `MISTYPED_CODE_HINT_DELAY` and give it the same 15s value, with a comment saying why a trusted send needs one
- [x] 4.4 Pass the hint from `SendPanel` only while `starting` and `noAnswer`, so it disappears the moment the answer lands

## 5. Check it on real screens

- [x] 5.1 `npm run check`, and `npx prettier --write` only the files this change touched
- [x] 5.2 Desktop: run a real trusted send end to end and watch the accept — the spinner becomes a check in place, the label changes, nothing else moves, then the gauge takes over
- [x] 5.3 Desktop: confirm the check is not so brief it reads as a flicker on a fast local connection; if it is, note it rather than reinstating a second screen
- [x] 5.4 Desktop: drag the window wide and narrow, including across the `sm` breakpoint where the card swaps `bleed`↔`card` chrome, and confirm the mark and label stay centred and the card does not look broken at either width
- [x] 5.5 Phone: the same flow in both directions, confirming a long device name does not wrap the label into a paragraph
- [x] 5.6 Send to a device with Floppy closed and confirm the hint appears after the delay, the mark and label above it are unchanged, and cancelling still works from there
- [x] 5.7 With reduced motion on, confirm the spinner and the check still read as the state (the pop degrades, the states do not)

## 6. Fold in the completion screen

- [x] 6.1 Rename the component to `src/lib/components/feedback/StatusHero.svelte`, beside `EmptyHero`, and widen its API to `mark: 'pending' | 'success'` plus optional `title`, `label`, `hint`
- [x] 6.2 Carry `TransferComplete`'s reasoning across: it is the app's one completion screen and has no path variant on purpose
- [x] 6.3 Slide the long-wait hint in with `fly`, the way `ReceiveSearching` does its own late hint, instead of blinking it into place
- [x] 6.4 Point both panels' done states at `StatusHero mark="success"`, passing the old title as `title` and the old description as `label`
- [x] 6.5 Delete `TransferComplete.svelte` and confirm no caller is left
- [x] 6.6 Take no action slot: a transfer panel's controls stay in `TransferCard`'s anchored zone, which `transfer-panel-layout` requires by scenario
- [x] 6.7 Desktop: check both done screens with the bigger mark — send with a device target (title plus label) and a code receive (title only)
