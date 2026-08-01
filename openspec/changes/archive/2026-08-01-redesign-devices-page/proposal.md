## Why

The Devices page is four stacked sections separated by rules, and the one thing you came for — your
devices — is last, under a 176px QR card. Opening the page mints a pairing code whether or not you
came to pair, that code dies after two minutes with nothing on screen to say so, and if the pairing
service did not come up the page hides your device list entirely, so you cannot even rename or remove
a device you already have. Nothing on the page connects a device to the thing you do with it: send.

## What Changes

- **The list leads.** Devices page becomes: this device, then your devices, then one "Add a device"
  entry. The pairing surfaces stop competing with the list for the top of the screen.
- **The two halves of a pairing split by what they need.** This device's code stays on the page, under
  this device's name; taking the other device's code becomes a surface the list opens (drawer on mobile,
  dialog on desktop). Both are reachable with no role to pick, which is the requirement, and the half
  that needs a keyboard is the only one that gets a surface.
- **A code is minted when you uncover it, not when you open the page.** The auto-show effect goes away.
  A code costs a broker mailbox and a 2-minute pairing session, and the card is covered until asked for:
  behind the blur, a minted code and an empty card look the same, so the request waits for the uncover.
- **A shown code is honest about its life.** `show_pair_code` starts returning how long the code lasts
  alongside the code, the flow counts it down, and when it runs out (or gets used by the other device)
  the code is marked spent with one line and one way forward: show a new one.
- **The send target selection survives leaving the Send screen.** It moves out of `SendPanel`'s local
  state into the shared send state, so picking a device and coming back later does not silently fall
  back to the code send.
- **Managing devices works with no connection.** The list, rename, remove, and this device's own name
  are local operations and stay available when pairing is down. Only the add flow is blocked, with one
  line saying why, in the place you would have tapped.
- **Row actions are buttons, not a gesture.** Rename and remove are both visible controls on every
  pointer type. Swipe-to-remove is gone: it was undiscoverable, it fought the list's scrolling, and it
  put the destructive action behind a drag on the pointer type least suited to one. Size and the
  confirmation are what keep a thumb safe now.
- **Scanning gets its place in the flow now.** The add flow carries a "Scan their code" entry that opens
  a scan step shaped for the camera to drop into. No camera, no fake viewfinder, no permission prompt,
  and typing the code stays a complete path. The slot exists so the flow can be shaped now instead of
  scanning being wedged in beside a finished layout later. It is not marked as a preview: there are no
  users yet, and the developer-facing note lives in the component.

Out of scope, and named so it is not mistaken for done:

- **The working scanner.** `device-management` already requires scanning on a camera platform, and no
  camera code exists in the repo — on a phone you type a 4-digit-plus-3-word code today. A scanner
  plugin, native permissions, and on-device verification are their own change; this one builds the frame
  it drops into.
- **Richer device rows** (paired-on date, phone-vs-laptop glyph, last-seen) would need new fields in
  the trust store and in the pairing payload. Not in this change.

## Capabilities

### New Capabilities

None. This reshapes existing surfaces.

### Modified Capabilities

- `device-management`: the page's structure and hierarchy (list first, add flow opened on demand,
  code minted only when the flow opens, this device's panel distinct from the paired rows), the code's
  visible lifetime and spent state, sending to a device from its row, the scan slot in the add flow,
  and the page's behaviour when pairing is unavailable.
- `device-pairing`: `show_pair_code` reports the shown code's lifetime so the UI can count it down
  instead of guessing or duplicating the timeout constant.
- `transfer-panel-layout`: the send target selection lives in shared send state and survives leaving
  the Send screen.
- `interaction`: swipe-to-remove on a device row is removed; rename and remove are visible buttons on
  every pointer type, both grown rather than slopped because they sit next to each other.
- `app-shell`: a bottom surface's safe-area inset and its own padding no longer stack, the safe-area
  rules for portaled surfaces are not overridable by a surface's own spacing utilities, and a focused
  field is brought clear of the soft keyboard.

## Impact

- Dependencies: `@dicebear/core` and `@dicebear/collection` (9.4.3) render this device's avatar
  locally. No CSP change and no network: the SVG is generated in-process as a data URI.
- Frontend: new `src/lib/keyboard.ts` (keeps a focused field above the keyboard, wired in
  `src/routes/+layout.svelte`), `src/routes/devices/+page.svelte` (slimmed to header + this device + list + add entry), new
  `src/lib/components/devices/` components (add-device flow, scan step, device row, this-device panel),
  `src/lib/components/spell/qrcode/qrcode.svelte` (one path instead of a node per module, so drawing a
  code cannot stall the surface animating open),
  `src/lib/pairing-app.svelte.ts` (`showCode` return shape), `src/lib/transfer-app.svelte.ts` and
  `src/lib/components/transfer/send/SendPanel.svelte` (target selection moves into shared state).
- Rust: `src-tauri/src/pairing/service.rs` and `src-tauri/src/lib.rs` — `show_pair_code` returns the
  code plus its lifetime; `PAIR_TIMEOUT` becomes the single source for both sides.
- Generated IPC: `src/lib/ipc/bindings.ts` is regenerated (`show_pair_code` return type changes).
- Gates: `cargo test` in `src-tauri/`, `npm run check`, `npm run lint`.
- No broker change, no wire-protocol change, no trust-store schema change.
