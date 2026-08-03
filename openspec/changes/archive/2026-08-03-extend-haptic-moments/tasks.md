# Tasks: extend-haptic-moments

## 0. Permission fix (done alongside the proposal)

- [x] 0.1 Replace the invalid `haptics:default` in `src-tauri/capabilities/mobile.json`
      with `haptics:allow-impact-feedback` and `haptics:allow-notification-feedback`
      (the plugin defines no default permission set, so the old grant denied every call)
- [x] 0.2 Confirm a mobile dev build accepts the capability (android `cargo check` with
      the NDK toolchain passes; note it also passed with the bad value, so build-time
      validation never catches this class of bug — only the editor schema and the
      runtime ACL do)

## 1. Haptics module

- [x] 1.1 Add a `feelVisible()` wrapper in `src/lib/haptics.ts` that no-ops unless
      `document.visibilityState === 'visible'`, then delegates to `feel()`; keep it as
      silent as `feel()` itself
- [x] 1.2 Add the new moments to the `haptics` object with doc comments in the existing
      voice: `arrived` (warning notification, via `feelVisible`), `paired` (success
      notification, via `feelVisible`), `peerAccepted` (medium impact, via `feelVisible`),
      `failed` (error notification, via `feelVisible`), `pullTriggered` (light impact,
      plain `feel` — it is finger-driven)
- [x] 1.3 Update the module header comment: the list now includes moments that arrive
      from elsewhere, and those are foreground-gated

## 2. Wire the event moments

- [x] 2.1 `src/lib/pairing-app.svelte.ts`: fire `haptics.arrived()` in the
      `pairingOfferEvent` and `pairingRequest` listeners
- [x] 2.2 `src/lib/pairing-app.svelte.ts`: fire `haptics.paired()` in the
      `pairingPaired` listener and `haptics.peerAccepted()` in the `pairingAccepted`
      listener
- [x] 2.3 `src/lib/pairing-app.svelte.ts`: fire `haptics.failed()` in the
      `pairingDeclined` and `pairingError` listeners
- [x] 2.4 `src/lib/transfer-app.svelte.ts`: fire `haptics.failed()` in the `errorEvent`
      listener; confirm cancel paths stay silent (they emit no terminal event)

## 3. Pull-to-refresh trigger

- [x] 3.1 `src/lib/actions/pull-to-refresh.svelte.ts`: add a per-touch `triggered` latch;
      fire `haptics.pullTriggered()` on the first crossing of the trigger distance, do not
      re-fire on re-crossings, reset the latch when the touch ends

## 4. Verify

- [x] 4.1 `npm run check` and lint pass; confirm no haptic call sites outside the moments
      listed in the spec (grep for `impactFeedback`/`notificationFeedback` — only
      `haptics.ts` may import them)
- [x] 4.2 On-device (real phone, not emulator/simulator): offer arrival buzzes in
      foreground, backgrounded arrival gets only the OS notification, failure and paired
      notes fire, pull trigger ticks once per pull
- [x] 4.3 Desktop: all the same flows run silently with no errors logged
