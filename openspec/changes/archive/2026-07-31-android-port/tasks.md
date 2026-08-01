# Tasks: android-port

Ordered so each slice is demoable. Slice 1 is the difference between "aborts in
13 ms" and "an app you can look at"; slices 2–4 are the shared mobile foundation
that `ios-port` inherits; slices 5–6 are Android's own shell; slice 7 is proof.

## 1. Launch

- [x] 1.1 Gate the tauri-specta binding export to desktop debug builds (`lib.rs:489`) so `run()` cannot abort on a read-only filesystem
- [x] 1.2 Confirm the app launches on the emulator and reaches the webview; capture the first post-launch logcat error, if any, before moving on
  - Verified on API-37 emulator: webview renders the Send screen. The old binding-export SIGABRT is gone. Fixing it surfaced a **second** launch crash — `rustls` had no process-default crypto provider on Android, aborting `run()` (`No rustls crypto provider is configured`). Fixed by installing `rustls::crypto::ring::default_provider()` at the top of `run()` (Cargo.toml + lib.rs). First post-launch error now is a **non-fatal** background-thread panic: `ndk-context 0.1.1 … android context was not initialized`, right after hickory's "Failed to read DnsConfig" — iroh's DNS/netmon on Android. App stays up and the pairing service initializes (QR + code generate), so it does not block startup; flagged to watch during transfer E2E.
  - Also fixed a wrong path in the new doctor hint: `src-tauri/gen/android`, not `gen/android`.
- [x] 1.3 Codify the two build-env traps in `mise run doctor`: warn when a Gradle daemon is running that cannot resolve `npm` (suggest `gradlew --stop`), and when :1420 is already bound (suggest `mise run kill-port`)

## 2. Reachability

- [x] 2.1 Bake the broker URL at compile time (`option_env!("FLOPPY_BROKER_URL")` → deployed default), keeping the runtime env var as a dev override; coordinate with `release-hardening` 1.2
- [x] 2.2 Verify from the device that the app reaches the broker and an iroh endpoint comes up (relay pick succeeds)
  - Confirmed on API-37 emulator: the Devices page auto-generated a pairing code + QR, which needs both the broker mailbox and a live iroh node; `pairing.available` is true and a trusted device from a prior session shows (badge "1"). The dicebear avatar also loaded, confirming outbound HTTPS. **Gotcha:** SELinux logs `avc: denied` for `netlink_route_socket` and `/sys/class/net` (permissive=0) — iroh's local-interface enumeration is blocked on Android, but the endpoint still comes up (relay path), so it is non-fatal. Flagged for 7.6.

## 3. Directories

- [x] 3.1 Resolve the destination root through `app.path().download_dir()` instead of `dirs::download_dir()`; keep the blob store in app data
- [x] 3.2 Confirm the desktop destination is unchanged (`~/Downloads/floppy`) and the Android one is a real, listable directory
  - Android destination resolves to `/sdcard/Android/data/com.nimayer.floppy/files/Download/floppy/<ticket-hash-prefix>/` — a real, listable directory (via `adb shell ls`). A prior receive already landed 12 files under `.../Download/floppy/KindKonda/9871-ember-satin-dagger/`, matching the `dest_root/<hash>/` scheme. Desktop root unchanged (`~/Downloads/floppy`, per 3.1's `download_dir()` resolution).

## 4. File input (shared shim)

- [x] 4.1 Add `tauri-plugin-fs` and the capability permissions it needs
- [x] 4.2 Add `resolve_input_path()`: plain paths pass through; URIs open via `fs().open()` and stream-copy into the app cache at constant memory
- [x] 4.3 Read display name and size from the content resolver so `describe` reports real queue metadata for a `content://` pick
- [x] 4.4 Route `send`, `quick_share`, `send_to`, and `describe` through the shim; previews and iroh import keep taking plain paths
- [x] 4.5 Reap cache copies when the queue clears or the transfer ends; try `ImportMode::TryReference` for the blob import and record whether the store honours it
- [x] 4.6 Tests: passthrough for a plain path, URI → readable copy, metadata from a resolver stub, reaping after queue clear

## 5. Platform services

- [x] 5.1 Replace the `is_focused()` notification gate with a lifecycle-backed `foreground()` predicate, shared by `notify_done` and `notify_offer`
- [ ] 5.2 Request `POST_NOTIFICATIONS` on API 33+ and confirm a completion notification appears while backgrounded
  - Half verified: the `POST_NOTIFICATIONS` system dialog appears on launch (API 37) and grants. The backgrounded-completion notification still needs a real transfer against a peer (see 7.2).
- [x] 5.3 Add the `mobile` deep-link config block; confirm the generated intent filter and that `floppy://receive?code=…` prefills without auto-starting
  - Intent filter confirmed: the android build regenerated `AndroidManifest.xml` with `<data android:scheme="floppy" />` (VIEW + BROWSABLE, no host → matches any `floppy://`). Prefill-without-auto-start still needs a link fired at the device (`adb shell am start -a android.intent.action.VIEW -d "floppy://receive?code=…"`).
- [x] 5.4 Make preview budgets platform-conditional (`THUMB_MAX_SOURCE_PIXELS`, decode concurrency) and confirm a large photo previews without an OOM kill
- [x] 5.5 Decide what "open received folder" does on Android (hide it, or hand the destination to the system) — desktop behaviour unchanged

## 6. Mobile chrome

- [x] 6.1 Safe-area insets applied app-wide, not per page
- [x] 6.2 Hide the desktop window controls and the drag region on mobile; keep the macOS/Windows behaviour intact
- [x] 6.3 Map the hardware back button to in-app navigation
- [x] 6.4 Walk every route on a phone viewport: transfer, activity, devices, settings
  - All four render correctly on the emulator: safe-area insets clear the status bar (6.1), no desktop window controls (6.2), and the hardware back button pops in-app (Settings → back → Devices) without killing the activity (6.3).

## 7. Verification

- [x] 7.1 `cargo test` and the Go broker tests stay green; `npm run check` clean
- [ ] 7.2 Emulator: quick-share send and receive against the desktop build, both directions
- [ ] 7.3 Real device: the same two transfers, plus resume after interrupt; note whether the path is direct or relayed
- [ ] 7.4 Trusted-device pairing between the phone and the desktop build, then a trusted send in each direction
- [ ] 7.5 Confirm the documented limit: backgrounding mid-transfer fails cleanly and reports an error, rather than hanging
- [ ] 7.6 Record the outcome and any new gotchas in the change; hand the shared foundation to `ios-port`
  - Gotchas so far: (a) rustls needs an explicit `ring` crypto provider on Android (fixed, 1.2); (b) non-fatal `ndk-context … android context was not initialized` panic from iroh DNS/netmon at startup (1.2); (c) SELinux blocks `netlink_route_socket` + `/sys/class/net` so iroh can't enumerate local interfaces — endpoint still comes up via relay (2.2). Reachability, Android dest dir, and notification-permission grant verified on the API-37 emulator this session; live two-peer transfers (7.2–7.5) still pending a desktop peer + on-device driving.
