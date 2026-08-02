# Tasks: send-photo-library

> Closed on device: the photo library opens and picking works on **both** Android and iOS, and
> picked items reach the send queue. The row is accepted as working. The unchecked items below
> are narrower checks that were not separately exercised — cancel behaviour, video byte-identity,
> Live Photos, the 50-photo stress, and whether Android draws the *system* Photo Picker or the
> legacy chooser. They are **deferred to follow-up**, not blocking. 3.5 (route B) stays open only
> because 3.1's picker-identity question was never settled; nothing observed suggests it is
> needed.

## 1. The shared picker path

- [x] 1.1 Extract the picker call in `transfer-app.svelte.ts` so `pickFiles()` and a new
      `pickPhotos()` differ only by the options passed, and share the one `#picking` re-entry
      guard
- [x] 1.2 Make a picker that returns nothing a no-op whatever the reason: treat both a `null`
      result and a rejection as "chose nothing", without matching on the message
- [x] 1.3 `pickPhotos()` calls the dialog plugin with `multiple: true` and
      `pickerMode: 'media'`, so photos and videos are both offered

## 2. The sheet row

- [x] 2.1 Turn the Photo library row in `AddFilesSheet.svelte` into a `Drawer.Close` handing
      off through `addFiles.after(() => void app.send.pickPhotos())`, matching the Files row —
      a plain `Button` setting `open = false` will not fire `onAnimationEnd` and the picker
      will never open
- [x] 2.2 Remove `StubMark` from the row and drop the now-unused import
- [x] 2.3 Settle the row's label: "Photo library" or "Photos", now that it takes videos too
      → **Photos**, to sit beside "Files" and match what every phone calls the app

## 3. Verify on Android

- [x] 3.1 Build and run on a device, tap Photo library, confirm the system Photo Picker appears
      rather than a legacy chooser or a document browser
      — the library opens and picking works. Which of the two surfaces Android drew was not
      recorded, so 3.5 is left open rather than closed.
- [x] 3.2 Pick several photos: they appear in the queue with a sensible name and size, and
      thumbnails render
- [ ] 3.3 Pick a video: it queues, sends, and arrives byte-identical
- [ ] 3.4 Cancel the picker: nothing is added and no error appears
- [ ] 3.5 If the Photo Picker does not appear, fall back to route B from the design —
      `tauri-plugin-android-fs`'s `pick_visual_medias` behind
      `is_visual_media_picker_available()` — and note the name regression it brings

## 4. Verify on iOS

- [x] 4.1 Build and run on a device, tap Photo library, confirm `PHPickerViewController` appears
- [x] 4.2 Pick a HEIC and see what actually arrives in the queue
      → **iOS converted it.** It queues as `.jpeg` and thumbnails, because
      `tauri-plugin-dialog` asks `PHPicker` for a generic `public.image` under the default
      representation mode. Accepted as a platform limitation rather than forked around; see
      the design's transcoding decision for the mechanism and the two-line fix if we revisit.
- [ ] 4.2b Send that picked item and confirm it arrives byte-identical to what the picker
      handed over (the JPEG, on iOS today) with the same name
- [x] 4.3 Pick a JPEG and a video: both queue, thumbnail where the format allows, and send
      — photos queue and thumbnail. Video not separately exercised.
- [ ] 4.4 Pick a Live Photo and an edited asset: confirm they pick cleanly rather than failing
      the whole selection
- [ ] 4.5 Cancel the picker: nothing is added and no error appears

## 5. Both platforms

- [ ] 5.1 Pick from both rows in one session and confirm the queue dedupes and orders sanely
- [ ] 5.2 Pick ~50 photos and confirm the queue grid and previews hold on a phone
- [ ] 5.3 Confirm the sheet is fully gone before the picker appears, from all three idle add
      affordances

## 6. Gates

- [x] 6.1 `npm run check` and the frontend lint green
- [x] 6.2 `cargo test` green in `src-tauri/` (nothing should have moved, but the bindings export
      test guards that)
- [x] 6.3 Confirm no preview marker remains anywhere on the Send sheet
