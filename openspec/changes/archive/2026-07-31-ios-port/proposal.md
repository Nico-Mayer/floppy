# iOS port

## Why

`android-port` lands the shared mobile foundation: the binding export no longer
aborts on a read-only filesystem, the broker URL is compiled in, directories come
from Tauri's path resolver, picked files pass through one `resolve_input_path()`
shim, notifications gate on foreground rather than window focus, preview budgets
are phone-sized, and the shell handles safe areas. All of that is
platform-agnostic and iOS inherits it unchanged.

What remains is genuinely Apple-shaped: a build toolchain with its own failure
modes, a plist that has to declare intent before the OS grants anything, and
Apple's privacy prompts sitting in front of the LAN paths iroh wants to use.

This change is deliberately sequenced second. Verifying the shared shims on one
platform first means an iOS failure is an iOS problem, not an ambiguity.

## What Changes

- **Toolchain.** The known `tauri ios dev` traps are already codified in
  `mise run doctor` (xcode-select pointing at CommandLineTools; a broken rustup
  default, because Xcode's Build Rust Code phase strips `RUSTUP_TOOLCHAIN`). This
  change confirms them against a clean run and adds whatever the simulator and
  device runs turn up.
- **Info.plist.** `NSLocalNetworkUsageDescription` so iroh's LAN hole-punching is
  allowed rather than silently degraded to relay-only;
  `NSPhotoLibraryUsageDescription` for the photo picker; `CFBundleURLTypes` for
  the `floppy://` scheme.
- **File input.** iOS already hands back a real `file://` inside the sandbox —
  `UIDocumentPickerViewController(asCopy: true)` and the photo picker copy on the
  way out — so `resolve_input_path()` is a passthrough. This change verifies that
  claim on device, and confirms the security-scoped branch of
  `tauri-plugin-fs` covers the case where it does not hold.
- **Verification.** Simulator and real device: quick share both directions,
  trusted-device pairing with the desktop build, and a phone-to-phone transfer
  against the Android build from `android-port`.

## Non-Goals

- **QR scanning** — its own change, covering both platforms.
- **Background transfers.** Same documented limit as Android; the iOS version
  (BGTask / URLSession assertions) is its own change and is the harder half.
- **Share Extension** as a send target.
- **App Store packaging**, signing profiles, TestFlight.

## Capabilities

### Modified Capabilities

- `app-shell-tauri` gains iOS as a supported target, with the platform's privacy
  declarations and picker semantics.

## Impact

- `src-tauri/gen/apple/floppy_iOS/Info.plist`, `project.yml` — usage
  descriptions, URL types.
- `src-tauri/tauri.conf.json` — iOS deep-link config.
- `scripts/doctor-macos.sh` — whatever the clean runs turn up.
- Rust and frontend changes expected to be **none**: if iOS needs a code change
  outside the shims, that is a signal the seam was drawn in the wrong place and
  belongs back in the shared layer.

## Dependencies

Requires `android-port` (shared mobile foundation) to be complete.
