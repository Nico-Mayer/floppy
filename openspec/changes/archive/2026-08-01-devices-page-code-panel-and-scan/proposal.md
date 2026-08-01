## Why

The Devices page ended the last change with a code card taking a third of the screen above the device
list, for something most visits never look at: your own code matters only while another device is being
added. And on a phone the way you would actually add a device — point the camera at the other screen — is
a placeholder frame, so everyone types a 34-character code by hand instead.

## What Changes

- **This device's code moves into a panel opened from the page heading.** A QR icon button sits at the
  trailing edge of the "Devices" heading row and opens a drawer (phone) or dialog (desktop) holding the QR,
  the code, its countdown, and Copy. The page itself becomes this device's name and the device list,
  nothing else.
- **The code panel drops the reveal veil.** The veil existed because the code sat on screen whether or
  not anyone wanted it there. Opening a panel *is* the intent to show it, so covering the contents of a
  surface the user just opened is a tap that buys nothing.
- **A code is minted when the panel opens** and dropped when it closes, so a visit that never opens it
  costs no broker session.
- **Scanning becomes real, and becomes the default way to add a device on a phone.**
  `tauri-plugin-barcode-scanner` (2.4.5, Android + iOS) provides the camera; the scanned code goes
  straight into the existing `redeem_pair_code(code, "qr")` path, which already skips the SAS compare
  for a scanned code. On a phone the add-device control opens the camera; on desktop, where the plugin
  does not exist, it opens the code field as it does today.
- **Typing never stops being reachable.** Asking to type, a denied camera, or a scanner failure all land on
  the code field; going back to the app lands on the app. The field offers the way back to the camera.
- **The camera runs under the app's own chrome**, not in a full-screen OS surface. `windowed: true` puts it
  behind the webview, so a sheet of ours sits over it with the frame to aim, the way back to the app, and
  "Type the code instead". The placeholder scan step goes away; this replaces it with the real thing.
- **`PageHeader` gains one action slot** at the trailing edge of its title row, so a page title can carry a
  control without each route hand-rolling its own heading row.

New platform surface this adds: the camera. That means a usage string on iOS
(`NSCameraUsageDescription`), the permission on Android, and capability entries for the plugin — and it
means the scan path can only be verified on real hardware, since a simulator has no camera.

## Capabilities

### New Capabilities

None. This reshapes existing surfaces and adds a plugin to an existing platform capability.

### Modified Capabilities

- `device-management`: where this device's code lives (a panel opened from the heading rather than a
  section of the page), the page's own order, scanning as the default way to add a device on a phone with
  typing always reachable, and the code's lifecycle now that it is panel-scoped and uncovered.
- `app-platform`: the barcode-scanner plugin joins the plugin-backed services, with the camera permission
  each mobile platform needs and the rule that a denied camera never blocks pairing.
- `app-shell`: a page heading can carry one trailing action, from the same shared pattern every route
  already uses.

## Impact

- Frontend: `src/lib/components/devices/` — `SelfCodeCard.svelte` becomes a panel (`CodePanel.svelte`),
  `ScanStep.svelte` is deleted, `DeviceList.svelte` learns the scan-first entry, `EnterCodeDialog.svelte`
  becomes the fallback path; `src/lib/components/shell/PageHeader.svelte` gains the leading slot;
  `src/routes/devices/+page.svelte` loses the code section and gains the heading trigger; new
  `src/lib/scan.svelte.ts` wrapping the plugin (permission, windowed run, single settle, outcome mapping)
  and `ScanSheet.svelte` drawing the app's chrome over the camera, mounted from `+layout.svelte`;
  `RevealVeil.svelte` deleted with its last consumer.
- Rust: `src-tauri/Cargo.toml` + `lib.rs` register `tauri-plugin-barcode-scanner` (mobile only, so behind
  the same `#[cfg(mobile)]` shape the other mobile plugins use).
- Config: `src/routes/layout.css` gains the `html[data-scanning]` rules that stop the shell painting over
  the camera; `src-tauri/capabilities/mobile.json` gains the scanner permissions;
  `src-tauri/gen/apple/floppy_iOS/Info.plist` gains `NSCameraUsageDescription` (and `project.yml` keeps it
  through an `xcodegen` regen); the Android manifest gains the camera permission if the plugin does not
  merge its own.
- Dependencies: `@tauri-apps/plugin-barcode-scanner` 2.4.5.
- No broker change, no wire-protocol change, no trust-store change, no IPC command change: scanning is a
  frontend plugin call that feeds an existing command.
- Gates: `cargo test` in `src-tauri/`, `npm run check`, `npm run lint`. The camera itself needs a real
  Android device and a real iPhone.
