## Why

The Send sheet on a phone offers two rows, Files and Photo library, and the second one has
been a preview marker since the sheet was built. Files works; the photo library does nothing.
On a phone that is the row people reach for first, because most of what anyone wants to send
from a phone is a photo or a video, and the document picker is a poor way to find one.

It turns out to need almost no new machinery. `tauri-plugin-dialog` 2.7.2 already presents
`PHPickerViewController` on iOS and an image/video intent on Android when it is asked for a
media picker, and `fileinput.rs` already turns whatever a picker hands back — a path, a
`file://` URL, or a `content://` URI — into something the transport and the preview protocol
can use unchanged. The work is wiring, not plumbing.

## What Changes

- The Photo library row opens the platform's photo picker and appends what the user chose to
  the send queue, exactly as the Files row does.
- The row loses its preview marker.
- Photos **and videos** are offered, not photos alone.
- Files are sent **as they are**. No transcoding, no HEIC-to-JPEG conversion, no re-encoding
  of video. The point of the app is that what arrives is what was sent, byte for byte.
- A picked HEIC therefore has no thumbnail in the queue grid — the `image` crate cannot decode
  it — and keeps the generic tile with its extension badge. That is honest and costs nothing.
- Cancelling the picker on Android leaves the queue untouched instead of surfacing an error.
  The Android dialog plugin rejects rather than resolving on cancel, which the existing Files
  path does not handle either; this change fixes it once, for both rows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transfer-panel-layout`: the requirement **The floating add button opens one sheet offering
  files and the photo library** currently specifies that the photo library choice does nothing
  and carries a preview marker. That inverts: it opens the photo picker, appends what was
  chosen, and carries no marker.
- `app-platform`: adds a requirement that the photo library is reached through the same dialog
  plugin as files rather than a second picker, and that cancelling any picker is an ordinary
  no-op rather than an error.

`preview-markers` needs no delta: it specifies that working screens carry no marker and never
enumerates which surfaces are marked, so removing one marker satisfies the existing spec
rather than changing it.

## Impact

- `src/lib/components/transfer/send/AddFilesSheet.svelte` — the Photo library row becomes a
  `Drawer.Close` handing off through `addFiles.after()`, the same shape as the Files row, and
  drops `StubMark`.
- `src/lib/transfer-app.svelte.ts` — a `pickPhotos()` beside `pickFiles()`, sharing the
  `#picking` re-entry guard; both gain cancel handling.
- No Rust change, no new plugin, no IPC change. `NSPhotoLibraryUsageDescription` is already in
  `src-tauri/gen/apple/floppy_iOS/Info.plist`; Android's photo picker needs no permission.
- Depends on `transfer-storage-hygiene` in practice but not in code: a 4 GB video picked from
  the gallery costs three copies of itself on disk until that change lands. Ship this second.
