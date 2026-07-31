## Context

Received files are exported by iroh-blobs to a real filesystem path under a
`dest_root`. Today `dest_root` = `app.path().download_dir()/floppy`, and
`receive_dest(root, sender, tag)` builds `<sender>/<code>` (trusted) or `<code>`
(code). On Android `download_dir()` resolves to the **app-private** external dir
(`Android/data/<pkg>/files/Download`), which is hidden from the Downloads app and
deleted on uninstall — so received files are effectively lost to the user. iOS
would be the same (app sandbox). Two problems: the **root** is not user-visible on
mobile, and the **layout** is unspecified and leaks the SPAKE2 code phrase into
folder names.

Platform storage models differ, so a single filesystem path is not portable:
- Desktop: real `~/Downloads`, direct fs.
- Android 10+ (scoped storage): the public Downloads collection is only writable
  through MediaStore / SAF, not an arbitrary path.
- iOS: no shared Downloads at all; apps write their sandbox, optionally surfaced
  in the Files app.

## Goals / Non-Goals

**Goals:**
- Received files land in the **user-visible** location on every platform.
- One **logical layout** everywhere, findable by recency, filename-safe, no secret
  leakage.
- iroh keeps writing to a real `File`/fd (no rewrite of the export path).

**Non-Goals:**
- User-chosen custom download folder (future opt-in; see Decision 4).
- Migrating past receives.
- Changing the IPC contract or transfer protocol.

## Decisions

### Decision 1 — Layout: flat-chronological `floppy/<datetime>[ from <device>]/`

Every transfer is one folder directly under `floppy/`, named by a filename-safe,
chronologically-sortable datetime; ` from <device>` is appended only when the
sender is a trusted device. `<datetime>` = `YYYY-MM-DD HH-MM-SS` — no `:` (illegal
on Windows), seconds included so multiple receives in the same minute don't
collide; the existing `-2`/`-3` suffix stays as a same-second backstop. Single-file
transfers are still foldered, for a predictable mental model.

- *Chosen over sender-shelf (`floppy/<device>/<datetime>/`):* this is a
  grab-it-now transfer app, so recency dominates. A flat, time-sorted tree puts the
  latest receive at the top of `floppy/` with zero digging, keeps code and trusted
  transfers the same shape, and collapses `receive_dest` to one rule. Sender-shelf
  optimizes the rare "browse everything from my laptop" case at the cost of daily
  friction and a mixed tree (device folders beside datetime folders).
- Stop using the **code phrase** as a folder name — it is the transfer's SPAKE2
  password, and a datetime is more findable later anyway.

### Decision 2 — Per-platform root behind one destination service

Resolve the root in one place; the layout above is identical on top of it.

| Platform | Root | Mechanism |
| --- | --- | --- |
| Desktop | `~/Downloads/floppy/…` | native fs (unchanged) |
| Android | public **Downloads** | `tauri-plugin-android-fs` |
| iOS | app **Documents**/`floppy/…` | native fs + Files exposure |

### Decision 3 — Android via `tauri-plugin-android-fs`, not hand-rolled MediaStore

The plugin (community, active) exposes exactly what we need. **API note:** this was
planned against v8.1.0 but implemented against the current **v29.0.0**, whose API
differs — the calls below are the v29 ones:
`android_fs().public_storage().create_new_file_with_pending(None,
PublicGeneralPurposeDir::Download, "floppy/<datetime>[ from <device>]/<filename>",
mime)` → `FsUri`, then `android_fs().open_file_writable(&uri)` → a **real
`std::fs::File`**, then `set_pending(&uri, false)` + `scan(&uri)` to reveal and
index the entry. No storage permission on API 29+. iroh-blobs export only writes to
a path it opens itself, so we export to the app-private `dest` first and `io::copy`
each file into the plugin `File` (symmetric to the existing input-URI → cache shim),
reaping the app-private copy after. MediaStore is per-entry, so files are created
one at a time with `relative_path` carrying the nested folder — structure is
preserved. All Android glue lives in `android_publish` in `lib.rs`, injected into
the transport as a `publish` hook so the core stays platform-agnostic.

- *Chosen over hand-rolled MediaStore JNI:* far less code and maintenance for the
  same result. Cost: a community dependency — pin the version.

### Decision 4 — iOS: app Documents + Files exposure, no plugin

iOS has no Downloads and `tauri-plugin-android-fs` is Android-only. Write the app
**Documents** dir (a real path iroh can target natively) and set
`UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` in `Info.plist` so the
`floppy/…` tree appears under Files → On My iPhone → Floppy. No extra plugin.

### Decision 5 — Custom folder is a future opt-in, not the default

`tauri-plugin-scoped-storage` (Android SAF tree URI + iOS security-scoped
bookmarks, persisted) is the right tool for a user-chosen destination, but it
forces a folder-pick grant — wrong as a default for "it's a download." Deferred to
a later "choose download folder" setting.

## Risks / Trade-offs

- **Community plugin dependency (`tauri-plugin-android-fs`).** → Pin the version;
  the API used (`create_file`/`open_file`) is small and stable. Fallback is a
  hand-rolled MediaStore path if it goes unmaintained.
- **iroh export may not accept a foreign `File`.** → Fall back to export-to-cache
  then `io::copy` into the plugin `File`; extra IO, already the app's pattern.
- **MediaStore is per-file.** → Fine for our flat per-transfer folder; set
  `relative_path` per file. Duplicate display names get MediaStore's `(1)` suffix
  within a folder — our per-transfer folders keep collisions rare.
- **Flat tree scatters same-sender history.** → Accepted (Decision 1); the archival
  case is served by search/sort, not the tree.

## Migration Plan

Frontend/Rust only. Past receives keep their existing folders (no data migration).
Land as: (1) `receive_dest` → flat-chronological datetime layout + tests; (2) the
destination-service root abstraction; (3) Android `tauri-plugin-android-fs`
integration; (4) iOS Documents + Info.plist; (5) per-platform "open received
folder" affordance. Roll back per-slice via git.

## Resolved Questions

- **Does iroh-blobs' export accept a provided `File`/writer, or only a path?**
  Resolved: only a path it opens itself (`blobs().export(hash, path)`). So Android
  takes the export→copy hop — the export loop writes the app-private `dest`, then
  the `publish` hook `io::copy`s each file into the plugin `File`. Same as the
  input-URI shim in reverse.
- **One MediaStore entry per file, or a single entry per transfer?** Per-file,
  matching desktop/iOS, with the nested `relative_path` preserving the per-transfer
  folder. MediaStore is per-entry anyway.
