# Tasks: android-port

Ordered so each slice is demoable. Slice 1 is the difference between "aborts in
13 ms" and "an app you can look at"; slices 2–4 are the shared mobile foundation
that `ios-port` inherits; slices 5–6 are Android's own shell; slice 7 is proof.

## 1. Launch

- [ ] 1.1 Gate the tauri-specta binding export to desktop debug builds (`lib.rs:489`) so `run()` cannot abort on a read-only filesystem
- [ ] 1.2 Confirm the app launches on the emulator and reaches the webview; capture the first post-launch logcat error, if any, before moving on
- [ ] 1.3 Codify the two build-env traps in `mise run doctor`: warn when a Gradle daemon is running that cannot resolve `npm` (suggest `gradlew --stop`), and when :1420 is already bound (suggest `mise run kill-port`)

## 2. Reachability

- [ ] 2.1 Bake the broker URL at compile time (`option_env!("FLOPPY_BROKER_URL")` → deployed default), keeping the runtime env var as a dev override; coordinate with `release-hardening` 1.2
- [ ] 2.2 Verify from the device that the app reaches the broker and an iroh endpoint comes up (relay pick succeeds)

## 3. Directories

- [ ] 3.1 Resolve the destination root through `app.path().download_dir()` instead of `dirs::download_dir()`; keep the blob store in app data
- [ ] 3.2 Confirm the desktop destination is unchanged (`~/Downloads/floppy`) and the Android one is a real, listable directory

## 4. File input (shared shim)

- [ ] 4.1 Add `tauri-plugin-fs` and the capability permissions it needs
- [ ] 4.2 Add `resolve_input_path()`: plain paths pass through; URIs open via `fs().open()` and stream-copy into the app cache at constant memory
- [ ] 4.3 Read display name and size from the content resolver so `describe` reports real queue metadata for a `content://` pick
- [ ] 4.4 Route `send`, `quick_share`, `send_to`, and `describe` through the shim; previews and iroh import keep taking plain paths
- [ ] 4.5 Reap cache copies when the queue clears or the transfer ends; try `ImportMode::TryReference` for the blob import and record whether the store honours it
- [ ] 4.6 Tests: passthrough for a plain path, URI → readable copy, metadata from a resolver stub, reaping after queue clear

## 5. Platform services

- [ ] 5.1 Replace the `is_focused()` notification gate with a lifecycle-backed `foreground()` predicate, shared by `notify_done` and `notify_offer`
- [ ] 5.2 Request `POST_NOTIFICATIONS` on API 33+ and confirm a completion notification appears while backgrounded
- [ ] 5.3 Add the `mobile` deep-link config block; confirm the generated intent filter and that `floppy://receive?code=…` prefills without auto-starting
- [ ] 5.4 Make preview budgets platform-conditional (`THUMB_MAX_SOURCE_PIXELS`, decode concurrency) and confirm a large photo previews without an OOM kill
- [ ] 5.5 Decide what "open received folder" does on Android (hide it, or hand the destination to the system) — desktop behaviour unchanged

## 6. Mobile chrome

- [ ] 6.1 Safe-area insets applied app-wide, not per page
- [ ] 6.2 Hide the desktop window controls and the drag region on mobile; keep the macOS/Windows behaviour intact
- [ ] 6.3 Map the hardware back button to in-app navigation
- [ ] 6.4 Walk every route on a phone viewport: transfer, activity, devices, settings

## 7. Verification

- [ ] 7.1 `cargo test` and the Go broker tests stay green; `npm run check` clean
- [ ] 7.2 Emulator: quick-share send and receive against the desktop build, both directions
- [ ] 7.3 Real device: the same two transfers, plus resume after interrupt; note whether the path is direct or relayed
- [ ] 7.4 Trusted-device pairing between the phone and the desktop build, then a trusted send in each direction
- [ ] 7.5 Confirm the documented limit: backgrounding mid-transfer fails cleanly and reports an error, rather than hanging
- [ ] 7.6 Record the outcome and any new gotchas in the change; hand the shared foundation to `ios-port`
