## 1. Heading slot

- [x] 1.1 Add one optional `action` snippet prop to `src/lib/components/shell/PageHeader.svelte`, rendered at the trailing edge of the title row, with the heading owning its spacing
- [x] 1.2 Confirm every current caller (Devices, Settings, and any other titled route) renders unchanged when it passes nothing

## 2. Code panel

- [x] 2.1 Turn `SelfCodeCard.svelte` into `src/lib/components/devices/CodePanel.svelte`: the same code lifecycle inside a `ResponsiveDialog`, with an `open` prop
- [x] 2.2 Mint on open, drop the code and its state on close, and keep the non-reactive guard so a failed request is not retried in a loop
- [x] 2.3 Remove `RevealVeil` from the code path: the panel is the reveal, so the QR and code text are legible as soon as it is
- [x] 2.4 Drop the "cover a spent code" behaviour with it; a spent code is still replaced by its line and its one control
- [x] 2.5 Keep the fixed-height slot, the QR-to-code gap of zero, the reserved code line, and Copy as the only live action
- [x] 2.6 Close the panel when `pairing.paired` bumps
- [x] 2.7 Wire it up from the Devices route: a QR icon button passed to `PageHeader` as the leading action, opening the panel
- [x] 2.8 Remove the code section from `src/routes/devices/+page.svelte` and reword the list's empty state, which no longer has a code card "above" to point at

## 3. Scanner: native side

- [x] 3.1 Add `tauri-plugin-barcode-scanner = "2.4.5"` to `src-tauri/Cargo.toml` under the mobile target, and register it in `lib.rs` under `#[cfg(mobile)]` next to the other mobile-only plugins
- [x] 3.2 Add the scanner's permissions to `src-tauri/capabilities/mobile.json`, extending that file's description to say what the grant is for
- [x] 3.3 Add `NSCameraUsageDescription` to `src-tauri/gen/apple/floppy_iOS/Info.plist`, worded like the usage strings already there
- [x] 3.4 Checked: the plugin ships `<uses-permission android:name="android.permission.CAMERA"/>` in its own `android/src/main/AndroidManifest.xml`, so Gradle merges it and the app manifest needs no edit
- [x] 3.5 `cargo test` green, and `cargo check` for both mobile targets

## 4. Scanner: frontend wrapper

- [x] 4.1 Add `@tauri-apps/plugin-barcode-scanner` 2.4.5
- [x] 4.2 Create the only importer of the plugin (`src/lib/scan.svelte.ts`): `canScan()` from `isPhoneChrome`, and a `scanner` holding the run, doing check-then-request permission, `scan({ windowed: true, formats: [Format.QRCode] })`, and mapping the outcome onto one of `scanned` / `cancelled` / `type` / `denied` / `failed`
- [x] 4.3 Keep the plugin's enums, cancel semantics, and error strings inside that module; no component imports it

## 5. Scan-first on a phone

- [x] 5.1 Branch the add-a-device control in `DeviceList.svelte`: on a phone build call `scanCode()`, on desktop open the code dialog
- [x] 5.2 On `scanned`, hand the content to `pairing.redeemCode(content, 'qr')` with no parsing
- [x] 5.3 On `cancelled`, open the code dialog
- [x] 5.4 On `denied`, open the code dialog, say the camera is off, and offer the platform's settings
- [x] 5.5 On `failed`, open the code dialog and report what happened
- [x] 5.6 Keep a "Scan instead" control in `EnterCodeDialog` on phone builds, so neither direction is a one-way door
- [x] 5.7 Delete `ScanStep.svelte`; the plugin draws its own full-screen camera

## 6. Copy pass

- [x] 6.1 Read every new or changed string against the voice rules: no "expired", "timeout", "permission denied", "unsupported", no em dash, and each one says the next thing to do

## 7. Verify

- [x] 7.1 `npm run check` and `npm run lint` clean, `cargo test` green
- [x] 7.2 Desktop: the heading's QR button opens the panel, a code arrives, the countdown runs, letting it run out offers a new one, and the panel does not resize through any of it
- [x] 7.3 Desktop: the add-a-device control opens the code field and no camera is requested
- [x] 7.4 Desktop: pair two instances, one showing from the panel and one typing, and confirm both surfaces close themselves
- [ ] 7.5 On a real Android device: the add control opens the camera, scanning the other device's QR pairs, and the first run asks for the camera once — BLOCKED, no Android hardware available. iOS covers the flow; what is Android-specific and still unproven is the plugin's own `CAMERA` manifest merge and whether windowed transparency needs anything the iOS webview did not
- [x] 7.6 On a real iPhone: the same, plus the usage string appears in the system prompt
- [x] 7.7 On a phone: deny the camera, then confirm the code field opens with the line about the camera and the way to Settings, and that typing still pairs
- [x] 7.8 On a phone: cancel the scanner and confirm the code field opens
- [x] 7.9 `openspec validate devices-page-code-panel-and-scan --strict`

## 8. Third pass on the panel

- [x] 8.1 Move the code trigger to the trailing edge of the heading row, and rename the heading's slot to `action` to match
- [x] 8.2 Truncate a long title rather than pushing the action off the row
- [x] 8.3 Give the trigger a visible edge instead of a ghost fill
- [x] 8.4 Drop the card around the QR and code inside the panel: the panel's own edge is the only one needed
- [x] 8.5 On screen: the trigger reads as a button at the end of the heading row, and the panel's contents sit in one surface rather than two

## 9. The camera under the app's own chrome

- [x] 9.1 Run the scan windowed, so the camera is behind the webview instead of in an OS surface with no way back
- [x] 9.2 Turn `src/lib/scan.ts` into `src/lib/scan.svelte.ts`: a `scanner` owning the run, `active` for the chrome, and one `#end` so a stop and the plugin's resulting rejection settle the attempt once
- [x] 9.3 Add a `type` outcome, distinct from `cancelled`: asking to type opens the field, going back opens nothing
- [x] 9.4 Settle the camera permission before any chrome appears
- [x] 9.5 Create `ScanSheet.svelte`: the way back, a corner-marked frame with nothing painted inside it, what to point at, and "Type the code instead"
- [x] 9.6 Mount it from the layout, outside the shell it hides
- [x] 9.7 Add the `html[data-scanning]` rules to layout.css, unlayered so `bg-background` on the body and the sidebar inset do not win
- [x] 9.8 On a real phone: the camera shows through the frame, the app's controls sit over it, both exits work, and the shell paints normally again afterwards
- [x] 9.9 On a real phone: confirm windowed mode actually shows the camera. Verified on iOS: the CSS transparency is sufficient and no native tweak was needed, so the `windowed: false` fallback stays unused

## 10. The aiming window

- [x] 10.1 Dim everything outside the aiming window with one spread shadow on the window itself, so the camera reads as being in a frame rather than behind the whole screen
- [x] 10.2 Keep every ancestor of the window free of `overflow-hidden`, since the dimming reaches past the viewport on purpose
- [x] 10.3 Record why a bounded live preview inside a drawer is not available with this plugin, so it is not re-attempted
- [x] 10.4 Stack the chrome above the dimming: a box shadow from a later sibling paints over an earlier one, which had the stop button sitting under its own screen's dimming
- [x] 10.5 On a real phone: the window is bright, everything around it is dimmed to the screen edges, the corner marks sit on the camera rather than on a dark box, and both controls read as pressable

## 11. What a successful scan looks like

- [x] 11.1 Hand the redemption to `scanner.run(handle)` so the camera surface owns the whole attempt, not just the read
- [x] 11.2 Add the phases the sheet renders: aiming, caught, added, retry
- [x] 11.3 Acknowledge a read the moment it happens: fill the window, say it caught something, and add a `scanned` haptic
- [x] 11.4 Say the wait ("asking them to link") and the end of it ("Added") before closing, holding the success beat long enough to read
- [x] 11.5 On a refused code, show why in the sheet and return to the camera instead of closing
- [x] 11.6 Keep the stop control in every phase that can last, and hide it only in `added`
- [x] 11.7 Drop the `scanned` outcome from `DeviceList`: it now only handles the endings with no code in them
- [x] 11.8 On a real phone: scan a live code and watch catch, wait, added, close; then scan a spent code and confirm the reason shows and the camera comes back

## 12. No state without an exit

- [x] 12.1 Keep the stop control present while waiting on the other device, relabelled "Stop waiting"
- [x] 12.2 Say when a wait is running long (`WAIT_SLOW`), and bring back "Type the code instead" at that point
- [x] 12.3 End the wait automatically (`WAIT_LIMIT`) before the core's two-minute pairing bound, landing on the code field
- [x] 12.4 Clear every timer on any ending, so a stopped attempt cannot fire a late failure
- [x] 12.5 Leave the core's redemption running when the wait is abandoned: a late yes still pairs and still updates the list
- [x] 12.6 On a real phone: scan a code and never answer on the other device — confirm the line changes, typing is offered, and the surface gives up on its own
- [x] 12.7 On a real phone: scan, press stop mid-wait, then say yes on the other device — confirm the device still appears in the list

## 13. Opening and closing the camera

- [x] 13.1 Cross-fade the shell instead of switching visibility, with `pointer-events: none` covering what visibility was doing, and no transition under reduced motion
- [x] 13.2 Move the document flag to `ScanSheet`: set as it appears, cleared on its own `onoutroend`, so the shell does not return under a sheet that is still leaving
- [x] 13.3 Keep the aiming window filled for `CAMERA_WARM` so a starting camera is never a black square, and fade the corner marks in behind it
- [x] 13.4 Ask for the camera a beat *after* the chrome is on screen: `scan()` was invoked in the same microtask as `active`, so the native side made the webview transparent and attached the camera before Svelte had rendered the sheet
- [x] 13.5 Restart the warm timer from the moment `scan()` is actually called, so it measures the camera rather than the attempt, and covers a retry too
- [x] 13.6 Clear the document flag at outro *start*, not end, so the shell fades back in across the chrome's fade out instead of after it, and fill the window on the way out so the stopping camera is not a black square
- [ ] 13.7 On a real phone: opening reads as one motion with the chrome first, closing reads as one motion, and there is no black frame at either end

## 14. Left unverified

- Android hardware (7.5). Every other check in this change passed: desktop on a Mac, and the whole camera
  flow on an iPhone including windowed transparency, both exits, the wait's two stages, a spent code, and a
  late yes after a stop.
- What that leaves unproven is Android-specific and named in the design: the plugin merging its own
  `CAMERA` permission, and whether that WebView's background needs anything the iOS one did not. The
  `windowed: false` fallback covers the second case if it ever bites.
