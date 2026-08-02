## 1. Import and export by reference

- [x] 1.1 Switch `build_collection` (`transport/manager.rs`) from `add_path` to
      `add_path_with_opts` with `ImportMode::TryReference`, keeping the `TempTag` pinning
      exactly as it is
- [x] 1.2 Switch the export loop in `do_receive` to `export_with_opts` with
      `ExportMode::TryReference`
- [x] 1.3 Add a transport test that imports a file above the inline threshold and asserts the
      store directory has not grown by the file's size
- [x] 1.4 Add a transport test that runs a full loopback transfer and asserts the exported file
      is byte-identical to the source, so reference mode has not changed what arrives

## 2. Clear the store at launch

Replaces the original "collect on terminal states" and "retention window" groups.
`gc_run_once` and `Blobs::delete` are private in iroh-blobs 0.103, so there is no way to
collect at a terminal event; the only collection the crate offers is a background timer.
Clearing the directory before the store opens does the same job with no task to run, and
keeps within-session resume for free. See design.md.

- [x] 2.1 Clear `store_path` before `FsStore::load` in `Manager::new_with_publish`, tolerating
      a missing directory and warning rather than failing on any other error
- [x] 2.2 Test: content left in a store directory is gone after a Manager is built on it
- [x] 2.3 Confirm `re_receive_is_idempotent_resume` still passes — it is now the
      within-session resume test, so give it a comment saying so

## 3. Sandbox copies

- [x] 3.1 In `fileinput.rs`, relocate an iOS picker copy into the queue directory with
      `std::fs::rename`, guarded on the path being inside the app's cache or temp directory
- [x] 3.2 Unit-test the guard: a path inside the app's caches is relocated, a path outside is
      returned untouched
- [x] 3.3 Call `ClearInputCache` from the send done path in `transfer-app.svelte.ts`, in
      addition to the existing `reset()` caller
- [x] 3.4 Confirm cancel still leaves the queue and its copies alone

## 4. Reconcile the written record

- [x] 4.1 Update the resume comments in `transport/manager.rs` and `lib.rs` so they say resume
      holds within a session rather than implying the store keeps content forever
- [x] 4.2 Update the resume sentence in `openspec/config.yaml`'s context block
- [x] 4.3 Update `design.md` and the `file-transfer` delta spec to the launch-clear design
- [x] 4.4 Update the `fileinput.rs` header comment, which currently says copies are reaped
      "when the send queue clears", to describe both triggers

## 5. Gates

- [x] 5.1 `cargo test` green in `src-tauri/` (87 passed), rustfmt clean, clippy clean on host,
      `aarch64-apple-ios`, and `aarch64-linux-android`
- [x] 5.2 `npm run check` and the frontend lint green

### Deferred: on-device measurement

Archived without these. Both need real hardware, and neither blocks the change — but neither
has run, so the mobile half of this is verified by unit tests and reading, not by observation.
`adopt()` in particular is the iOS leak fix and its `rename` has never executed on a device;
only its guard is unit-tested.

- [x] 5.3 DEFERRED — Android device: send a large video, confirm the app's data directory is
      back to its pre-send size once the transfer finishes and the app relaunches
- [x] 5.4 DEFERRED — the same on a real iOS device, including that the picker copy is gone
