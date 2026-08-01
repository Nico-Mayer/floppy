## 1. Rust: a shown code reports its lifetime

- [x] 1.1 Add a `PairCode { code: String, seconds: u32 }` type (Serialize + specta `Type`) next to `DeviceInfo` in `src-tauri/src/lib.rs`, or in `pairing/service.rs` if it reads better there
- [x] 1.2 Change `PairingService::show_pair_code` to return `PairCode`, filling `seconds` from `PAIR_TIMEOUT.as_secs()` so the constant stays the single definition
- [x] 1.3 Update the `show_pair_code` command signature in `lib.rs` and keep its doc comment accurate
- [x] 1.4 Add a unit test asserting the returned `seconds` equals `PAIR_TIMEOUT.as_secs()` and the code parses as a phrase (room derivable)
- [x] 1.5 Regenerate bindings (`cargo test export_bindings`) and confirm `src/lib/ipc/bindings.ts` now types `showPairCode` as returning `PairCode`
- [x] 1.6 `cargo test` green in `src-tauri/`

## 2. Frontend plumbing

- [x] 2.1 `pairing-app.svelte.ts`: `showCode()` returns the `PairCode` from the core (no reshaping, no defaults)
- [x] 2.2 `transfer-app.svelte.ts`: move the send-target selection into the send state as `picked` (default `'code'`), with a `choose(fingerprint)` method that only sets it
- [x] 2.3 `SendPanel.svelte`: drop the local `picked`, keep the `selection` derivation reading `app.send.picked`, and bind the picker to it as before
- [ ] 2.4 Verify a device chosen in the picker survives leaving `/send` and coming back, and that removing the chosen device falls the selection back to `'code'`
      (`picked` is module-scoped app state and the fallback is derived, so this is a behaviour check, not a code question)

## 3. SwipeRow: taps and swipes on one surface

- [x] 3.1 Track in `SwipeRow` whether the current pointer sequence was recognised as horizontal (set in `onProgress`, cleared on the next `pointerdown`)
- [x] 3.2 Add an `onclickcapture` guard on the sliding div that swallows a click when that flag is set
- [x] 3.3 When the row is open, a tap on the row content closes the reveal instead of reaching the row's action
- [x] 3.4 Comment the guard where it lives: why the gesture engine cannot do it (passive listeners, no `preventDefault`)

## 4. Devices components

- [x] 4.1 Create `src/lib/components/devices/SelfDeviceCard.svelte` — this device's name, inline rename via `InlineRename`, lifted out of `+page.svelte` unchanged in behaviour
- [x] 4.2 Create `src/lib/components/devices/DeviceRow.svelte` — `SwipeRow` + `Item.Root`, content region a button that calls `app.send.choose(fingerprint)` then routes to `/send`, with a visible send glyph, rename icon button beside it, destructive remove button on fine pointers only
- [x] 4.3 Keep the row's inline rename state and `onremove` as props so the page owns the remove confirmation and the rename target
- [x] 4.4 Create `src/lib/components/devices/DeviceList.svelte` — section heading, the rows, the zero-device `Empty.Root` whose action is the add trigger, and the add trigger as a secondary button in the header when devices exist
- [x] 4.5 Disable the add trigger when `pairing.available` is false and put one line beside it saying why, in the copy voice (no "expired", no em dash)

## 5. Add-a-device flow

- [x] 5.1 Create `src/lib/components/devices/AddDeviceDialog.svelte` on `ResponsiveDialog` (drawer on touch, dialog on mouse), with an `open` prop the list controls
- [x] 5.2 Request a code when the dialog opens (not on page load), holding `PairCode | null` plus the tick that drives the countdown; stop and clear the interval when it closes
- [x] 5.3 Render this device's half: `RevealVeil` over the QR and code text, copy-code button, remaining-time line, and "New code"
- [x] 5.4 Render the other device's half in the same surface: `CodeInput` + Connect, clearing the field after every attempt, success or failure
- [x] 5.5 Spent state: derive it from the countdown reaching zero or from `pairing.request` arriving while this dialog holds a code; force the veil back on, stop presenting the code as usable, and show one "Show a new code" control
- [x] 5.6 Close the dialog when a pairing completes (`pairing:paired` refreshes the list behind it)
- [x] 5.7 Delete the auto-`showCode` `$effect` and the `autoTried` flag with the old page sections

## 6. Scan slot

- [x] 6.1 Add a scan control (icon button) beside the code field in the add flow
- [x] 6.2 Create `src/lib/components/devices/ScanStep.svelte` — swaps the dialog body: framed placeholder with a scan glyph and one control back to typing, shaped so the camera drops in later without the flow moving
- [x] 6.3 No camera, no viewfinder imitation, no permission request anywhere in the step
- [x] 6.4 Hold the step in the dialog as `step: 'pair' | 'scan'`, reset to `'pair'` on close, and keep the code countdown running across the swap
- [x] 6.5 Carry the "no scanner behind this yet" note in the component comment, not in user-visible copy: no users to be honest to yet, and `preview-markers` is there if that changes

## 7. Rebuild the page

- [x] 7.1 Rewrite `src/routes/devices/+page.svelte` as `PageShell` + `PageHeader` + `SelfDeviceCard` + `DeviceList` + the existing remove-confirmation dialog
- [x] 7.2 Order it list-before-add, and drop the `pairing.available` gate around the page body
- [x] 7.3 Update the page header description so it describes the page, not just adding
- [x] 7.4 Keep pull-to-refresh clearing the page's transient state, minus the code state that now lives in the dialog

## 8. Verify

- [x] 8.1 `npm run check` and `npm run lint` clean
- [x] 8.2 Reviewed on desktop and on an iPhone across this change's passes; the findings that came out of it are groups 9-18
- [ ] 8.3 Pair two instances in both directions (show this device's code, and use theirs from the entry drawer) and confirm the drawer closes itself and the row appears
- [ ] 8.4 With the broker unreachable: list, rename, remove, and self-rename all still work, and only the entry control is blocked
- [ ] 8.5 Walk the scan slot on a phone build: the entry opens the step, and backing out returns to the field
- ~~8.6-8.8~~ dropped: written against the one-dialog flow, the row's tap-to-send, and swipe-to-remove, none of which survived the review passes
- [x] 8.9 `openspec validate redesign-devices-page --strict`

## 9. Review fixes

- [x] 9.1 Reshape this device's panel so it cannot be read as a row in the paired list: filled panel, person glyph, and a label saying what the name is for; drop the separator that made the page look like two lists
- [x] 9.2 Draw a QR as one `<path>` instead of a keyed `<circle>` per module, so ~300 SVG nodes are not built while a surface animates open
- [x] 9.3 Give the shown-code slot a fixed height so the dialog does not resize when the code arrives a round trip after it opens
- [x] 9.4 Thin out the dialog: countdown, Copy, and New code on one line, scan as an icon in the code row, no full-width buttons

## 10. Second review pass

- [x] 10.1 Mount the code card only once the surface has finished animating open, fading it in, with the fixed-height slot holding a spinner until then
- [x] 10.2 Put the card back around the QR and code text
- [x] 10.3 Offer the scan entry on phone builds only (`isPhoneChrome`, not viewport width), as its own full-width row above the code field
- [x] 10.4 Commit an inline rename when focus leaves it, treating the field's own cancel/save as inside
- [x] 10.5 Keep this device's panel one height across its resting and editing states
- [x] 10.6 Restore the gap the settings account marker lost when `StubMark` dropped its own margin

## 11. This device's avatar

- [x] 11.1 Add `@dicebear/core` and `@dicebear/collection` (9.x, matching the styles' peer range) and create `src/lib/components/devices/DeviceAvatar.svelte` rendering `createAvatar(...).toDataUri()` seeded by the device name
- [x] 11.2 Use it in `SelfDeviceCard` in place of the person glyph, seeded by `pairing.selfName`
- [x] 11.3 Leave the CSP alone: a data URI needs no new `img-src` host
- [x] 11.4 Note in the component which styles swap cleanly at this size, and that `initial-face` is API-only

## 12. Code card sizing

- [x] 12.1 Widen the add-a-device surface to `sm:max-w-lg` so the longest code is one line on a pointer device
- [x] 12.2 Close the gap between the QR and the code text
- [x] 12.3 Reserve the code line's height and step its size down to the 16px floor under `sm`, so a 34-character code wraps into space the card already had instead of growing it
- [x] 12.4 Grow the shown-code slot to match the card at its tallest
- [ ] 12.5 In the native window: force the longest possible code and check it neither wraps on desktop nor overflows on a phone

## 13. Shown-code half, third pass

- [x] 13.1 Make the code card fill the surface width (its wrapper was an auto-width flex item)
- [x] 13.2 Move the remaining time onto the card as a small pill, outside the veil and non-interactive, so it reads while the code is covered
- [x] 13.3 Make Copy the primary action of the row and demote "New code" to an icon-only ghost beside it
- [x] 13.4 Shorten the surface's description
- [x] 13.5 Give `ResponsiveDialog.Body` the vertical inset a footer would have when it is the surface's last slot, so the code field is not flush against the drawer's edge
- [x] 13.6 Move the drawer safe-area rules out of `@layer base` so a surface's own padding utility stops overriding them, leaving the panel's own edge offset as designed
- [ ] 13.7 On a phone: the clock is legible over a covered code (the drawer padding half of this became 18.3)

## 14. Split the two halves again

- [x] 14.1 Create `src/lib/components/devices/SelfCodeCard.svelte`: this device's code on the page, under its name, holding one height across covered, live, and spent states
- [x] 14.2 Request the code when the veil is lifted rather than on page load, and re-cover a spent code so the next lift asks for the next one
- [x] 14.3 Replace `AddDeviceDialog` with `EnterCodeDialog`: the code field, Connect, and the scan row on a phone build, nothing else
- [x] 14.4 Point the list's control at it and reword it to "Use their code"; update the empty state to name both directions
- [x] 14.5 Order the page name, code, devices, and let the shown code survive a pull to refresh
- [x] 14.6 Give the swipe reveal an icon over a word (`hint` on `SwipeRow`) so it is not a flat colour field
- ~~14.7~~ dropped: the swipe reveal it checked is gone (see 16.3); the card and drawer halves are covered by 15.5 and 18.3

## 15. Code card, held still

- [x] 15.1 Ask for one code as the page loads, with a non-reactive guard so a failed request is not retried in a loop
- [x] 15.2 Keep a replacement from blanking the card: `newCode` no longer clears the current code first
- [x] 15.3 Render the actions row in every state (copy + small replace while live, replace alone once spent) so it cannot pop in or out
- [x] 15.4 Reduce the spent state to a line inside the fixed-height card
- [ ] 15.5 In the native window: load the page, uncover, replace, and let one run out, watching that nothing below the card moves

## 16. Cut what is not earning its space

- [x] 16.1 Remove the replace-code control from the live card; the spent state keeps its own
- [x] 16.2 Remove tap-to-send from the device row, and `app.send.choose()` with it (no caller left); `picked` stays for surviving navigation
- [x] 16.3 Replace swipe-to-remove with a visible destructive button on every pointer type, and delete `SwipeRow.svelte`
- [x] 16.4 Rewrite the `interaction` delta as a REMOVED requirement plus the button rule, and drop the row-starts-a-send requirement from `device-management`
- [ ] 16.5 On a phone: rename and remove are both easy to hit and hard to confuse, and the list still scrolls cleanly

## 17. Keyboard occlusion

- [x] 17.1 Add `src/lib/keyboard.ts`: bring the focused field clear of the keyboard, measured against the visual viewport, scrolling the field's own region rather than the window
- [x] 17.2 Lend the region room when it has nothing left to scroll, and take it back on blur without flickering between two fields
- [x] 17.3 Wire it once in `+layout.svelte` beside `watchSafeArea`, phone builds only
- [ ] 17.4 On an iPhone: rename a device near the bottom of the list, and again with only one device paired, and check the field clears the keyboard both times

## 18. Drawer bottom space

- [x] 18.1 Take `max()` of the bottom safe-area inset and the surface's own padding instead of summing them
- [x] 18.2 Drop the call-site `pb-4` on the entry drawer's body, now that the inset lands
- [ ] 18.3 On an iPhone: the drawer's field sits just above the home indicator, with no dead band under it

## 19. Left for the device

Everything above is built and green on `cargo test`, `npm run check`, `npm run lint`, and `npm run build`.
What remains is behaviour only a running app can show, listed as its own group so archiving does not read
as "verified":

- 2.4, 8.3, 8.4, 8.5, 12.5, 13.7, 15.5, 16.5, 17.4, 18.3.

The desktop and iOS passes during this change surfaced 18 findings, all of which are fixed above; these
are the checks that were never explicitly walked end to end.
