# Tasks: mobile-targets

Moved from `tauri-iroh-migration` slice 6. Desktop parity is done there; this
change is the mobile bring-up.

## 1. Bring-up

- [ ] 1.1 iOS target: build, run, transfer end-to-end (iroh on iOS)
- [ ] 1.2 Android target: build, run, transfer end-to-end (iroh on Android)
- [ ] 1.3 Mobile picker returns a readable path/sandbox copy; previews run on the copy
- [ ] 1.4 Lower preview memory budgets for phones (`THUMB_MAX_SOURCE_PIXELS`, decode concurrency in `preview.rs`)
