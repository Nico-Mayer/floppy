# Tasks

## 1. Layout: flat-chronological naming

- [ ] 1.1 Rework `receive_dest` to build `floppy/<datetime>[ from <device>]/`:
      `<datetime>` = `YYYY-MM-DD HH-MM-SS`, ` from <device>` only for a trusted
      sender, code phrase never used, always a folder. Keep `path_component`
      sanitization and the `-2`/`-3` collision suffix.
- [ ] 1.2 Update the `receive_dest` unit tests: trusted → `<datetime> from <dev>`,
      code → `<datetime>`, sanitized/blank device, same-name collision → `-2`,
      single-file still foldered, code phrase absent from path.

## 2. Destination root service

- [ ] 2.1 Introduce one destination-root resolver so the layout sits on a
      per-platform root: desktop `~/Downloads`, iOS app Documents, Android public
      Downloads. Keep the blob store in app data (unchanged).

## 3. Android: public Downloads via tauri-plugin-android-fs

- [ ] 3.1 Add `tauri-plugin-android-fs` (Android target only; pin the version) and
      the capability permissions it needs.
- [ ] 3.2 On Android, resolve each received file through
      `PublicStorage::create_file(PublicDir::Download, "floppy/<datetime>[ from
      <device>]/<filename>")` → `open_file(uri, Write)` → `std::fs::File`.
- [ ] 3.3 Wire iroh export to that `File`: export directly if the API accepts a
      writer, else export to the app cache and `io::copy` into the plugin `File`,
      reaping the cache copy after (mirror the input-URI shim).
- [ ] 3.4 Confirm no storage-permission prompt on API 29+ and that files appear in
      the system Downloads/Files app.

## 4. iOS: Documents + Files exposure

- [ ] 4.1 Point the iOS destination root at the app Documents dir.
- [ ] 4.2 Set `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` in the
      iOS `Info.plist`; confirm `floppy/…` shows under Files → On My iPhone → Floppy.

## 5. Open received folder

- [ ] 5.1 Make the "open received folder" affordance point at the right place per
      platform (desktop reveals in a file manager; Android/iOS open the
      Downloads/Files location or hide the action where there is no reliable
      intent). Desktop behaviour unchanged.

## 6. Verify

- [ ] 6.1 `cargo test` (incl. new `receive_dest` tests) + `npm run check` green.
- [ ] 6.2 Emulator: receive via code and via a trusted device; confirm the files
      land in public Downloads under the datetime layout and are visible in Files.
- [ ] 6.3 iOS simulator/device: same, visible under Files.
- [ ] 6.4 Desktop: unchanged `~/Downloads/floppy/<datetime>…` layout.
