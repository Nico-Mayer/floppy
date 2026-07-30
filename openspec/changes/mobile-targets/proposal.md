# Mobile targets (iOS + Android)

## Why

Mobile is the whole reason for the Tauri/iroh rewrite. The `tauri-iroh-migration` change reached desktop parity with the Go/Wails app (transport, quick share, trusted devices, one-sided pairing, notifications, deep links, previews) but explicitly deferred the mobile targets. This change brings floppy to iOS and Android on the same Rust core.

The transport (iroh), rendezvous (broker mailbox + SPAKE2), and pairing (Ed25519/X25519) layers are pure Rust with no desktop-only assumptions, so they cross-compile. The mobile-specific work is the platform shell: file access under the sandbox, and memory budgets for phone-class devices.

## What Changes

- Build and run the app on **iOS** (device + simulator) and **Android** (device + emulator); a real end-to-end transfer works on each.
- The **file picker** returns a readable path — a sandbox copy on Android (`content://`) and iOS (security-scoped URL) — that iroh can send and previews can decode. This resolves the `content://` / security-scoped-URL blocker `preview.go` documented as unsolved.
- **Preview memory budgets** are lowered for phones: `THUMB_MAX_SOURCE_PIXELS` and decode concurrency in `preview.rs` are desktop-shaped and would get a low-memory build killed on a 48 MP photo.
- The **iOS toolchain gotcha** (Xcode's Build Rust phase / Gradle's cargo invocation stripping `RUSTUP_TOOLCHAIN`) is handled per the `mise run doctor` setup.

## Capabilities

### Modified Capabilities

- `app-shell-tauri` gains iOS + Android as supported targets, with mobile-native file access and phone-tuned preview budgets.

## Impact

- `src-tauri/` mobile build config (`tauri.conf.json` bundle/mobile, iOS `Info.plist`, Android manifest, `gen/`), `mise.toml` mobile toolchain (already scaffolded).
- `preview.rs` budget constants become platform-conditional.
- File-picker handling for sandbox copies; previews then run on the copy.
- No change to the transport/rendezvous/pairing cores.
