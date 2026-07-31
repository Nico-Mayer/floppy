## Why

Received files land in an app-private directory on mobile
(`Android/data/com.nimayer.floppy/files/Download/floppy/…`) — invisible to the
system Downloads app and wiped on uninstall. A file-transfer app whose received
files you cannot find is broken. The destination layout is also
implementation-defined (`dest_root/<sender>/<code>/`) rather than specified, and
the code phrase used as a folder name is the transfer's SPAKE2 password. We want
received files to land in the obvious, user-visible location on every platform,
under one predictable, findable layout.

## What Changes

- **One logical layout on every platform**: `floppy/<datetime>[ from <device>]/`,
  where `<datetime>` is `YYYY-MM-DD HH-MM-SS` (filename-safe, chronologically
  sortable) and ` from <device>` is appended only when the sender is a trusted
  device. Every transfer is its own folder (single file included). A same-second
  collision keeps the existing `-2`/`-3` suffix backstop.
- **Flat-chronological, not sender-shelf**: the folder tree under `floppy/` is a
  flat, time-sorted list — code and trusted transfers share the same shape.
  Replaces the current `floppy/<sender>/<code>/` nesting.
- **Stop using the code phrase as a folder name** — it is the SPAKE2 password;
  use the datetime instead (also more findable later).
- **User-visible root per platform**, resolved behind one destination service:
  - Desktop: `~/Downloads/floppy/…` (unchanged, native fs).
  - Android: the **public Downloads** collection via `tauri-plugin-android-fs`
    (`PublicDir::Download`, nested `relative_path`, real `std::fs::File` from
    `open_file`), no storage permission on API 29+.
  - iOS: the app **Documents** dir (native fs) surfaced in the Files app via
    `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace`.
- **iroh keeps exporting to a real `File`/path on every platform**; on Android
  that `File` comes from the plugin (export into it, or stream-copy from the cache
  export — symmetric to the existing input-URI shim).
- **BREAKING (internal): `receive_dest` naming changes** from
  `<sender>/<code>` to `<datetime>[ from <sender>]`. No user data migration
  (past receives keep their folders).
- Non-goal for this change: a user-chosen custom download folder. Noted as a
  future opt-in via `tauri-plugin-scoped-storage` (SAF / security-scoped
  bookmarks), not the default.

## Capabilities

### New Capabilities
- `download-destination`: where received files are written and how the
  destination root + per-transfer folder are resolved on each platform (desktop,
  Android, iOS), including the user-visible-location requirement and the naming
  layout.

### Modified Capabilities
<!-- none: transfer-delivery does not currently specify a destination. -->

## Impact

- **Rust:** `src-tauri/src/transport/manager.rs` (`receive_dest`, export target
  resolution), `src-tauri/src/lib.rs` (`dest_root` wiring). New dependency
  `tauri-plugin-android-fs` (Android only; pin the version). Capability
  permissions for the plugin.
- **iOS config:** `Info.plist` (`UIFileSharingEnabled`,
  `LSSupportsOpeningDocumentsInPlace`); destination = app Documents dir.
- **Frontend:** the "open received folder" affordance may need per-platform
  handling (desktop reveals in a file manager; Android/iOS point at the
  Downloads/Files location). No IPC contract change.
- **Tests:** `receive_dest` naming (flat-chronological, datetime, collision
  suffix), plus the android-fs export path where unit-testable.
