## 1. The link format

- [x] 1.1 Add `src/lib/code-link.ts`: `receiveLink(code)`, `pairLink(code)`, and
      `parseScanned(content) → { kind: 'receive' | 'pair' | 'bare'; code } | null`, validating the
      code against `CODE_PATTERN` from `code.ts` so junk never reaches a command. Header comment
      points at `route_deep_link` as its counterpart, the way `code.ts` points at `code::normalize`.
- [x] 1.2 Extend `route_deep_link` (`src-tauri/src/lib.rs`) to accept `floppy://pair?code=…`
      beside the existing receive route, ignore anything else, and emit the kind with the code.
- [x] 1.3 Add the kind to `DeepLink` in `src-tauri/src/events.rs`
      (`kind: "receive" | "pair"`), regenerate bindings (`cargo test export_bindings`), and check
      in `src/lib/ipc/bindings.ts`.
- [x] 1.4 Rust unit tests for `route_deep_link`: a receive link, a pairing link, a `+`-escaped
      code, an unknown `floppy://` path, and a non-floppy URL.

## 2. The scanner stops being pairing-shaped

- [x] 2.1 Change `scanner.run()` in `src/lib/scan.svelte.ts` to take one options object
      (`handle`, `copy`, optional `wait`), expose `copy` as state for the sheet, arm the
      slow/give-up timers only when `wait` is supplied, and rename the `paired` outcome to `done`.
- [x] 2.2 Move the pairing copy and the `WAIT_SLOW`/`WAIT_LIMIT` numbers to the pairing caller
      in `DeviceList.svelte`, so its behaviour is byte-for-byte what it is today.
- [x] 2.3 Read the copy from `scanner.copy` in `ScanSheet.svelte` instead of naming devices, and
      leave its `data-scanning` and transition handling untouched.
- [x] 2.4 Update the module header in `scan.svelte.ts`: it is no longer "mobile only, and only
      for adding a device" but "mobile only, pointed at a code by whoever opened it".

## 3. QRs carry links

- [x] 3.1 `SendCode.svelte`: the QR value becomes `receiveLink(code)`; the text beside it and
      `CopyButton` keep the bare code.
- [x] 3.2 `CodePanel.svelte`: the QR value becomes `pairLink(code)`; the shown code stays bare.
- [x] 3.3 Confirm both QRs still scan at their rendered sizes (`size-44` compact / `size-32`
      regular) with the longer payload, on a real screen and a real camera.

## 4. Scanning into a receive

- [x] 4.1 Add the camera control to `ReceiveCodeForm.svelte`, rendered only when `canScan()`,
      beside the code input inside the action zone, disabled while `scanner.active`.
- [x] 4.2 Write the receive scan handler: `parseScanned` the content, refuse a `pair` kind with
      the line naming the Devices screen, refuse `null` with the not-a-Floppy-code line, otherwise
      set `receive.code` and `await receive.start()` so a failure (including `busy`) throws back
      into the camera's retry path.
- [x] 4.3 Handle the outcomes in the Receive panel: `type` focuses the code input, `denied`
      toasts the camera-is-off line with the Settings action, `failed` toasts the message, `done`
      and `cancelled` open nothing (the panel behind is already showing the receive).
- [x] 4.4 Give the receive scan its own copy (`aim` / `caught` / `done`) in the app's voice, no
      em dashes, and no `wait` timers.

## 5. Scanning into a pairing keeps up

- [x] 5.1 `DeviceList.add()` runs the content through `parseScanned` too: a `pair` link or a bare
      code redeems as it does now (recorded as a scan), a `receive` kind is refused with the line
      naming the Receive screen, `null` with the not-a-Floppy-code line.

## 6. The pairing link lands somewhere

- [x] 6.1 Add a pending-code field to `pairing-app.svelte.ts` that a `pair` deep link sets.
- [x] 6.2 Branch the `events.deepLink` listener in `transfer-app.svelte.ts` on the kind:
      `receive` keeps today's prefill-and-navigate, `pair` sets the pending code and navigates to
      Devices.
- [x] 6.3 `DeviceList.svelte` opens `EnterCodeDialog` when a pending code arrives, and
      `EnterCodeDialog` takes a prefill prop, clears it on close, and redeems it with `'code'`
      (SAS), never `'qr'`.

## 7. Gates and on-device checks

- [x] 7.1 `cargo test` in `src-tauri/`, `npm run check`, `npm run lint` all clean; bindings diff
      is only the `DeepLink` kind.
- [x] 7.2 Two-phone check: send on one, scan from Receive on the other, files land. Then a
      pairing QR scanned from Receive, and a share QR scanned from Devices, both saying which
      screen they belong to with the camera still live.
- [x] 7.3 Check a scan into a busy device reports on the camera surface and the camera stays live.
- [x] 7.4 Open `floppy://receive?code=…` and `floppy://pair?code=…` on a phone and on desktop:
      one prefills Receive, the other opens the Devices code field filled in, neither acts by
      itself.
- [x] 7.5 Desktop check: no camera control on the Receive panel, the code field and button
      unchanged, no camera permission requested anywhere.
- [x] 7.6 Re-run the pairing scan flow on a phone (aim, caught, added, refused-code retry, give
      up on the wait) and confirm the generalised scanner changed nothing about it.
