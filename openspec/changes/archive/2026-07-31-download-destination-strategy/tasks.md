# Tasks

## 1. Layout: flat-chronological naming

- [x] 1.1 Rework `receive_dest` to build `floppy/<datetime>[ from <device>]/`:
      `<datetime>` = `YYYY-MM-DD HH-MM-SS`, ` from <device>` only for a trusted
      sender, code phrase never used, always a folder. Keep `path_component`
      sanitization and the `-2`/`-3` collision suffix.
- [x] 1.2 Update the `receive_dest` unit tests: trusted → `<datetime> from <dev>`,
      code → `<datetime>`, sanitized/blank device, same-name collision → `-2`,
      single-file still foldered, code phrase absent from path.

## 2. Destination root service

- [x] 2.1 Introduce one destination-root resolver so the layout sits on a
      per-platform root: desktop `~/Downloads`, iOS app Documents, Android public
      Downloads. Keep the blob store in app data (unchanged).
      → `resolve_dest_root` in `lib.rs` (desktop Downloads / iOS Documents;
      Android returns the logical Downloads root, actual bytes routed via §3).

## 3. Android: public Downloads via tauri-plugin-android-fs

- [x] 3.1 Add `tauri-plugin-android-fs` (Android target only; pin the version) and
      the capability permissions it needs.
      → pinned `=29.0.0` in an Android-only Cargo target block; plugin registered
      `#[cfg(target_os = "android")]`; `android-fs:default` granted via a new
      Android-scoped `capabilities/android.json`.
      NOTE: design/spec cite the plugin's OLD v8.1.0 API (`PublicStorage::create_file`,
      `FileUri`, `open_file`); the current crate is v29 with `AndroidFsExt` →
      `public_storage().create_new_file_with_pending(...) -> FsUri`,
      `open_file_writable(&uri) -> std::fs::File`, `set_pending`/`scan`. Implemented
      vs the real v29 API.
- [x] 3.2 On Android, resolve each received file through
      `PublicStorage::create_file(PublicDir::Download, "floppy/<datetime>[ from
      <device>]/<filename>")` → `open_file(uri, Write)` → `std::fs::File`.
      → `android_publish` in `lib.rs`: per file,
      `create_new_file_with_pending(None, PublicGeneralPurposeDir::Download,
      "floppy/<folder>/<name>", None)` → `open_file_writable` → `File`.
- [x] 3.3 Wire iroh export to that `File`: export directly if the API accepts a
      writer, else export to the app cache and `io::copy` into the plugin `File`,
      reaping the cache copy after (mirror the input-URI shim).
      → iroh-blobs export only takes a path, so the export loop writes to the
      app-private `dest` first (all platforms, unchanged); the Android `publish`
      hook then `io::copy`s each file into the plugin `File`, `set_pending(false)`
      + `scan`, and `remove_dir_all(dest)` reaps the staging copy. Type-checks
      against v29 for `--target aarch64-linux-android` (NDK CC), desktop unaffected.
- [x] 3.4 Confirm no storage-permission prompt on API 29+ and that files appear in
      the system Downloads/Files app.
      → debug APK built (Rust+gradle+plugin Kotlin), installed + launched on emulator
      API 37; user confirmed on-device that received files land in the right public
      Downloads folder with no permission prompt.

## 4. iOS: Documents + Files exposure

- [x] 4.1 Point the iOS destination root at the app Documents dir.
      → `resolve_dest_root` uses `document_dir()` on iOS.
- [x] 4.2 Set `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` in the
      iOS `Info.plist`; confirm `floppy/…` shows under Files → On My iPhone → Floppy.
      → keys added in `src-tauri/Info.ios.plist` (Tauri merges it into the
      generated plist). On-device Files visibility confirm is part of §6.3.

## 5. Open received folder

- [x] 5.1 Make the "open received folder" affordance point at the right place per
      platform (desktop reveals in a file manager; Android/iOS open the
      Downloads/Files location or hide the action where there is no reliable
      intent). Desktop behaviour unchanged.
      → `ReceivePanel.svelte`: desktop reveals via `OpenPath`; mobile hides the
      button (files land in system-visible Downloads/Files, reachable from the OS
      file apps; no reliable in-app intent to jump there). A trial "open the Files
      app at the exact folder on Android" was attempted (content DocumentsProvider
      URI) but did not work on-device, and is out of scope for this spec — reverted.

## 6. Verify

- [x] 6.1 `cargo test` (incl. new `receive_dest` tests) + `npm run check` green.
      → `cargo test --lib` 69 passed (one send-TTL timing test flakes under full
      parallel load, passes isolated + on clean tree — unrelated to this change);
      `npm run check` 0 errors. Also `cargo check --target aarch64-linux-android`
      clean (verifies the Android-gated `android_publish` against the real v29 API).
- [x] 6.2 Emulator: receive via code and via a trusted device; confirm the files
      land in public Downloads under the datetime layout and are visible in Files.
      → user confirmed on-device: downloads land in the appropriate public folders
      on Android (and desktop mac/windows).
- [x] 6.3 iOS simulator/device: same, visible under Files.
      → MOVED to `ios-port` §4.7 (verify) + §2.4 (plist keys); no iOS hardware in
      this session. Code for it (Documents root, `Info.ios.plist`) is landed here.
- [x] 6.4 Desktop: unchanged `~/Downloads/floppy/<datetime>…` layout.
      → integration tests run real iroh receive→export on the desktop host and
      assert `<root>/<datetime>[ from <device>]/<file>` (`each_receive_gets_its_own_folder`,
      `receive_from_a_named_peer_is_filed_under_that_name`, `quick_share_roundtrip`);
      the `~/Downloads` root is Tauri-stock `download_dir()`, unchanged. Desktop
      lib+bin build clean.
