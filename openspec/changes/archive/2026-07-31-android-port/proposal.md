# Android port

## Why

Mobile is the reason for the Tauri/iroh rewrite, and Android is where the
toolchain is already scaffolded (`gen/android`, NDK, emulator, Rust targets all
present). A smoke run on an API-37 emulator shows how far it gets today:

```
cargo → libfloppy_lib.so   ✓      gradle → APK   ✓      install + launch   ✓
process alive?             ✗ SIGABRT 13 ms in
```

```
thread '<unnamed>' panicked at src/lib.rs:492:10:
failed to export typescript bindings:
  Failed to create directory '../src/lib/ipc': Read-only file system (os error 30)
```

`run()` exports the tauri-specta bindings under `#[cfg(debug_assertions)]`. On
desktop that writes into the repo; on a phone the cwd is read-only, the
`.expect()` fires, and the process aborts before the webview loads. Every debug
mobile build dies there — iOS included.

Behind that first crash sit a handful of desktop-only assumptions: the broker URL
comes from a shell env var no Android process has, the destination directory
comes from `dirs::download_dir()` (`None` on mobile), the picker hands back
`content://` URIs that `std::fs` cannot open, and the preview decoder is sized for
a laptop's memory.

Most of those fixes are **not** Android-specific. This change lands them once,
behind shared shims, so `ios-port` inherits them and is left with genuinely
Apple-shaped work.

## What Changes

### Shared mobile foundation (iOS inherits)

- Binding export is gated to desktop debug builds, so `run()` cannot abort on a
  read-only filesystem.
- The rendezvous broker URL is **baked in at compile time**, with the existing
  env var kept as a dev override. A packaged mobile app has no shell env, so the
  current fallback silently points quick share and pairing at `127.0.0.1`.
- The destination root comes from Tauri's own path resolver
  (`app.path().download_dir()`), which maps to the platform download directory on
  each OS instead of returning `None` off-desktop. The blob store stays in app
  data.
- A single `resolve_input_path()` shim turns whatever the picker returns into a
  readable path: plain paths pass through; URIs are opened through
  `tauri-plugin-fs` (ContentResolver on Android, security-scoped access on iOS)
  and stream-copied into the app cache. iroh-blobs 0.103 has no stream import —
  `add_path` needs a real path — so materializing the copy is required, not a
  convenience. Copies are reaped when the queue clears.
- Preview budgets (`THUMB_MAX_SOURCE_PIXELS`, decode concurrency) become
  platform-conditional rather than desktop-shaped.
- Notification gating stops asking `is_focused()` — on mobile a backgrounded app
  is not an unfocused window — and uses a lifecycle-backed foreground predicate.
- The shell gets safe-area insets and hides the desktop-only window controls on
  mobile.

### Android specifics

- The picker path resolves `content://` URIs, including display name and size
  from the content resolver, so the queue shows real metadata.
- Deep links gain the `mobile` config block so the `floppy://` intent filter is
  generated.
- Notification permission (`POST_NOTIFICATIONS`) is requested on API 33+.
- The hardware back button maps to in-app navigation instead of killing the
  activity.
- Two build-env traps are codified in `mise run doctor`: Gradle resolves a bare
  `npm` against the **daemon's** PATH (a daemon started by Android Studio has no
  mise node → `A problem occurred starting process 'command 'npm''`, fixed by
  `gradlew --stop`), and a killed dev run leaks vite on :1420.

## Non-Goals

- **iOS** — `ios-port`, immediately after this change.
- **QR scanning.** The Devices page offers "scan its QR" but no scanner exists on
  any platform. Phone users type the code until a separate change adds a scanner
  for both platforms.
- **Background transfers.** A transfer requires the app to stay foregrounded. An
  Android foreground service and the iOS equivalent are their own change; this
  change documents the limit.
- **Share-sheet send target** (`ACTION_SEND`).

## Capabilities

### Modified Capabilities

- `app-shell-tauri` gains Android as a supported target, sandbox-aware file
  input, platform-resolved directories, a compile-time broker endpoint, and
  phone-tuned preview budgets.

## Impact

- `src-tauri/src/lib.rs` — binding-export gate, broker URL, dest root,
  notification gating, new path-resolution shim.
- `src-tauri/src/preview.rs` — platform-conditional budgets.
- `src-tauri/Cargo.toml` — `tauri-plugin-fs`.
- `src-tauri/tauri.conf.json`, `gen/android/app/src/main/AndroidManifest.xml`,
  `capabilities/` — deep-link mobile block, permissions.
- Frontend shell — safe areas, mobile-hidden window controls, back button.
- `scripts/doctor-macos.sh` — Gradle daemon and dev-port checks.
- No change to the transport, rendezvous, or pairing cores.
