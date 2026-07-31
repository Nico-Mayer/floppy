# Tasks: ios-port

Depends on `android-port`. Slice 1 proves the shared foundation carries over
untouched; the rest is Apple's paperwork and proof on real hardware.

## 1. Launch

- [ ] 1.1 Clean `mise run doctor`, then `tauri ios dev` against a booted simulator; record any toolchain trap not already covered and fold it into the doctor script
- [ ] 1.2 Confirm the app launches and reaches the webview — the shared binding-export gate from `android-port` should make this a non-event
- [ ] 1.3 Confirm the broker is reachable and an iroh endpoint comes up, with no environment variables set

## 2. Declarations

- [ ] 2.1 `NSLocalNetworkUsageDescription` in `Info.plist`; verify the prompt appears and that a direct LAN path is used afterwards
- [ ] 2.2 `NSPhotoLibraryUsageDescription` for the photo picker
- [ ] 2.3 `CFBundleURLTypes` for `floppy://` plus the iOS deep-link config; confirm a link prefills the code without auto-starting
- [ ] 2.4 `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` (set in `src-tauri/Info.ios.plist` by `download-destination-strategy`); confirm both merge into the generated `Info.plist`

## 3. File input

- [ ] 3.1 Verify the picker returns a readable sandbox path and that `resolve_input_path()` is a passthrough — no iOS branch added
- [ ] 3.2 Exercise the security-scoped branch (a file the picker does not copy) and confirm access is started and stopped correctly
- [ ] 3.3 Confirm previews decode within the phone budget on a large photo from the library

## 4. Verification

- [ ] 4.1 Simulator: quick-share send and receive against the desktop build
- [ ] 4.2 Real device: the same two transfers, plus resume after interrupt; note direct vs relayed
- [ ] 4.3 Trusted-device pairing with the desktop build, then a trusted send in each direction
- [ ] 4.4 Phone to phone: a transfer with the Android build, each direction
- [ ] 4.5 Confirm the documented limit: backgrounding mid-transfer fails cleanly rather than hanging
- [ ] 4.6 If any iOS fix landed outside the shared shims, note why the seam was wrong and whether it should move back into the shared layer
- [ ] 4.7 Download destination (from `download-destination-strategy` §6.3): receive via code and via a trusted device; confirm files land under the app Documents dir as `floppy/<datetime>[ from <device>]/`, and appear in Files → On My iPhone → Floppy (survive relaunch)
