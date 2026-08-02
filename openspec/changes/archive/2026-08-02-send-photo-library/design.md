## Context

The Send sheet on a phone has offered two rows since it was built — Files, which works, and
Photo library, which carries a preview marker and does nothing. Investigating what it would
take turned up that almost everything is already there.

**The picker exists.** `tauri-plugin-dialog` 2.7.2 takes a `pickerMode` of
`'document' | 'media' | 'image' | 'video'`. On iOS, `DialogPlugin.swift` branches on it and
presents `PHPickerViewController` instead of `UIDocumentPickerViewController`, copying each
result into the app sandbox and returning `file://` URLs. On Android, `DialogPlugin.kt` sets
the intent type to `image/*`, `video/*`, or both, and returns `content://` URIs.

**The path shim exists.** `fileinput.rs` already classifies whatever comes back:

```
picker returns                      classify()          transport
────────────────────────────────────────────────────────────────────
file:///…/IMG_0001.HEIC   ────────▶ Plain(path)  ──────▶ add_path    (iOS)
content://media/…/42      ────────▶ Uri(FilePath) ─copy─▶ add_path   (Android)
```

**The permission exists.** `NSPhotoLibraryUsageDescription` is already in
`src-tauri/gen/apple/floppy_iOS/Info.plist`. Android's photo picker needs none.

So the work is two frontend files. What is left to decide is what "photos" means, what happens
to formats the app cannot preview, and one latent bug the new row would make twice as visible.

## Goals / Non-Goals

**Goals:**

- The Photo library row does what its label says, on both mobile platforms, through the same
  queue path as Files.
- One picker implementation, not two.
- Cancelling either row leaves the queue untouched and shows nothing.

**Non-Goals:**

- A photo picker on desktop. The sheet only renders under `isPhoneChrome` precisely because
  there is no photo library to reach on a laptop.
- An in-app gallery, multi-select UI, or any picker chrome of our own. The OS draws it.
- Thumbnails for formats the `image` crate cannot decode. HEIC keeps the generic tile.
- Reducing the storage cost of a picked video. That is `transfer-storage-hygiene`'s job and
  the reason this change ships second.

## Decisions

### Photos and videos, through `pickerMode: 'media'`

The row says "Photo library", which on both platforms means the gallery, and a phone gallery
contains videos. Offering photos alone would mean the most common thing anyone wants to send
from a phone — a clip too big to message — is the one thing the row refuses.

*Cost, stated plainly:* a 4 GB video costs three copies of itself on disk today (gallery
original, picker copy, blob store copy). `transfer-storage-hygiene` takes that to one. This
change is what makes that easy to hit, which is the argument for that ordering, not against
this decision.

### We never transcode — but on iOS the picker does it before we see the file

The app converts nothing. No JPEG conversion, no re-encode, no "helpful" downscale, at any
point between the picker and the wire.

*Why, given it costs us something:* the app's proposition is that what arrives is what was
sent, byte for byte, verified by BLAKE3. Transcoding breaks that at the source, and quietly:
the user picks a photo, and a different photo arrives. A recipient on Windows who cannot open
a HEIC has a real problem, but it is their problem to solve with a viewer, and it is a smaller
problem than an app that silently degrades your originals.

**On iOS that promise is currently broken upstream, and we are living with it.** Two lines in
`tauri-plugin-dialog` 2.7.2 combine to hand us a JPEG where the user picked a HEIC:

- `ios/Sources/DialogPlugin.swift:98` builds its `PHPickerConfiguration` without setting
  `preferredAssetRepresentationMode`, so it stays `.automatic` — the mode that lets iOS
  transcode an asset for compatibility.
- `ios/Sources/FilePickerController.swift:220` then asks for the *generic* type,
  `loadFileRepresentation(forTypeIdentifier: UTType.image.identifier)`.

`.automatic` plus a generic `public.image` request is exactly the combination that makes iOS
deliver a JPEG rendition, named `IMG_xxxx.jpeg`. The same mechanism can turn HEVC into H.264
through the `UTType.movie` branch at `:197`. 2.7.2 is the latest release, so there is no
upstream fix to pick up.

*The decision:* leave the dependency alone. The fix is a two-line Swift change, but it is a
two-line Swift change in someone else's crate, which means a fork, a `[patch.crates-io]` entry
and a patch to re-apply on every bump — a standing maintenance cost for a platform behaviour
Apple may well change. Written down so nobody has to rediscover it:

```swift
configuration.preferredAssetRepresentationMode = .current
// and ask for the asset's own UTI rather than the generic one — .current alone
// still transcodes when the requested type is generic:
let typeId = result.itemProvider.registeredTypeIdentifiers
    .first { UTType($0)?.conforms(to: .image) == true } ?? UTType.image.identifier
```

Android is unaffected: `ACTION_GET_CONTENT` returns the original `content://` item and converts
nothing.

*What follows, stated plainly:* on iOS a picked HEIC arrives as a JPEG with a `.jpeg` name, and
its hash is the hash of that JPEG rather than of the asset in Photos. It thumbnails, because
`.jpeg` is in `PREVIEW_EXTS`. That is a real gap against "what arrives is what was sent", it is
the platform's doing rather than ours, and it is worth revisiting if Apple's default changes or
the maintenance cost of a fork stops mattering.

*Where the app's own honesty still shows:* `PREVIEW_EXTS` (`files.ts:11`, mirrored in
`preview.rs:46`) has no `heic`, and the `image` crate has no decoder for it. So a HEIC that
does reach the queue unconverted — from the Files row, or from Android — shows the generic tile
with its extension badge rather than a thumbnail. The tile already degrades this way for every
format it cannot decode, so this needs no new code and no apology.

### Android's Photo Picker via the dialog plugin, not a second plugin

`tauri-plugin-android-fs` is already a dependency (`=29.0.0`, wired in `lib.rs:685`) and
exposes `pick_visual_medias`, which fires `ACTION_PICK_IMAGES` — the real system Photo Picker,
with an availability probe and a `local_only` flag that skips cloud photos needing a download.
It is the more precise tool.

We are not using it, for now. Reasons, in order:

1. It would need a new Tauri command, a specta declaration, a capability entry and generated
   bindings — a permanent IPC surface for something the dialog plugin already does.
2. Android transparently routes an image/video-only `ACTION_GET_CONTENT` to the same Photo
   Picker on devices that receive Google system updates, so most users get identical UI.
3. Its own documentation warns that files picked this way lose their real name — the resolver
   returns a sequential number like `1000091523.png`, marked working-as-intended by Google.
   Through `ACTION_GET_CONTENT` the display name usually survives, and the name is what the
   receiver sees.

The fallback is written down rather than discovered later: if a real device shows the old
chooser instead of the Photo Picker, route B is `pick_visual_medias` behind
`is_visual_media_picker_available()`, and it is a contained change because `FsUri.uri` is a
plain `content://` string that drops straight into the existing `describe` path.

### Cancel is a no-op, on every platform

Android's `DialogPlugin.kt` answers `RESULT_CANCELED` with `invoke.reject("File picker
cancelled")`, and the Rust shim does not special-case it, so the JS promise rejects. iOS and
desktop resolve with `null`. `pickFiles` has no `catch`, so cancelling the picker on Android
today produces an unhandled rejection.

That is a pre-existing bug in the Files row, not something this change introduces — but the
Photo library row doubles how often anyone hits it, and both rows want the same handling. So
the cancel path is normalised once, in the shared picker helper, and both rows get it.
Distinguishing "cancelled" from a genuine picker failure is not worth prose-matching an error
string: a picker that returns nothing, for any reason, leaves the queue alone and says
nothing.

### One helper, two thin callers

`pickFiles()` and `pickPhotos()` differ by one option. They share the `#picking` re-entry
guard — currently a private field on the send state that stops a second tap opening a second
picker — because two different pickers open at once is exactly the failure the guard exists to
prevent, and two independent guards would not catch it.

The sheet row becomes a `Drawer.Close` handing off through `addFiles.after()`, structurally
identical to the Files row. That is load-bearing, not cosmetic: `add-files.svelte.ts` documents
that vaul only runs its close path — and therefore fires `onAnimationEnd` — when the close comes
from the primitive, so a plain `Button` that sets `open = false` would slide the sheet away and
never open the picker.

## Risks / Trade-offs

- **Android shows the legacy chooser instead of the Photo Picker on some device** → the row
  still works and still returns usable URIs; the UI is just less good. Route B is specced
  above and is a contained follow-up. Verify on a real device before closing this out.
- **A 4 GB video fills the phone** → real today and unchanged by this; ship
  `transfer-storage-hygiene` first. Worth checking whether the queue's existing total-size
  warning fires sensibly for video-sized entries.
- **HEIC arrives somewhere it cannot be opened** → accepted deliberately; see the transcoding
  decision. If it turns out to be a common complaint, the answer is a note in the receive UI,
  not a transcode.
- **Many photos at once stress previews** → `preview.rs` already serialises decodes on mobile
  and caps source pixels at a phone budget, so this should hold. Test with a 50-photo pick.
- **iOS Live Photos and edited assets** → the plugin requests `UTType.image` or `UTType.movie`
  and rejects an item conforming to neither, surfacing as a picker error. Worth confirming a
  Live Photo picks cleanly rather than failing the whole selection.

## Open Questions

- ~~Should the row read "Photos" rather than "Photo library"?~~ **Settled: "Photos."** It sits
  beside "Files", it is the word every phone puts on the app, and it does not promise a
  library of photos alone now that the row takes video.
- If a pick partially fails on iOS — one unsupported item in a selection of twenty — the plugin
  currently fails the whole batch. Is that the behaviour we want, or should the queue take
  what it can and say what it skipped?
- Adding files and drawing previews both feel slow on a phone. Three causes, none of them this
  change's to fix: iOS's transcode-then-copy on every pick (above), `preview.rs` decoding at
  full resolution behind a global mutex on mobile and re-encoding as PNG, and `describe`
  stream-copying a whole Android selection before the first tile appears. Its own change,
  sibling to `transfer-storage-hygiene`.
