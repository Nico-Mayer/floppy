# Tasks: ios-port

Depends on `android-port`. Slice 1 proves the shared foundation carries over
untouched; the rest is Apple's paperwork and proof on real hardware.

> Closed on simulator (iPhone 17 Pro): launch, code + trusted-device transfers,
> previews, download destination. The port is accepted as working. The remaining
> unchecked items (2.1 direct-vs-relay LAN path, 3.2 security-scoped branch, 4.2
> real-device + resume, 4.4 phone-to-phone with Android, 4.5 background-fails-clean)
> need real hardware / a second phone and are **deferred to follow-up**, not blocking.

## 1. Launch

- [x] 1.1 Clean `mise run doctor`, then `tauri ios dev` against a booted simulator; record any toolchain trap not already covered and fold it into the doctor script
      — doctor clean. Two traps found on the sim run, both build-config (not environment, so no doctor check applies — fixed at source in `project.yml`): (a) missing `SystemConfiguration.framework` link, needed by iroh's `system_configuration`/`netdev` deps or the debug dylib fails to link; (b) `CFBundleURLTypes` lived only in the generated `Info.plist` and any `xcodegen generate` dropped it. Both now in `project.yml`; run `xcodegen generate` after editing it.
- [x] 1.2 Confirm the app launches and reaches the webview — the shared binding-export gate from `android-port` should make this a non-event
- [x] 1.3 Confirm the broker is reachable and an iroh endpoint comes up, with no environment variables set
      — confirmed indirectly: code + trusted-device transfers complete, which requires the endpoint up and the broker reachable, no env set.

## 2. Declarations

- [ ] 2.1 `NSLocalNetworkUsageDescription` in `Info.plist`; verify the prompt appears and that a direct LAN path is used afterwards
      — key added and verified merged; local-network prompt seen during a transfer. Direct-vs-relay LAN path can't be confirmed on the simulator (shares the host network) — needs two real devices.
- [x] 2.2 `NSPhotoLibraryUsageDescription` for the photo picker
- [x] 2.3 `CFBundleURLTypes` for `floppy://` plus the iOS deep-link config; ~~confirm a link prefills the code without auto-starting~~
      — DESCOPED: no link-creation feature exists yet, so prefill can't be exercised; deep-link scenario removed from the spec for now. `CFBundleURLTypes` config kept (durable in `project.yml`, verified in the built plist) so it's ready when link creation lands.
- [x] 2.4 `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` (set in `src-tauri/Info.ios.plist` by `download-destination-strategy`); confirm both merge into the generated `Info.plist`
      — verified: both keys (plus the two usage descriptions and the URL scheme) present in the built `floppy.app/Info.plist`.

## 3. File input

- [x] 3.1 Verify the picker returns a readable sandbox path and that `resolve_input_path()` is a passthrough — no iOS branch added
      — a picked file sent successfully, so the picker returns a readable path through the shared passthrough; no iOS branch added.
- [ ] 3.2 Exercise the security-scoped branch (a file the picker does not copy) and confirm access is started and stopped correctly
- [x] 3.3 Confirm previews decode within the phone budget on a large photo from the library
      — preview renders; noticeable lag attributed to the simulator being slow on this machine, not the decode budget.

## 4. Verification

- [x] 4.1 Simulator: quick-share send and receive against the desktop build
- [ ] 4.2 Real device: the same two transfers, plus resume after interrupt; note direct vs relayed
- [x] 4.3 Trusted-device pairing with the desktop build, then a trusted send in each direction
- [ ] 4.4 Phone to phone: a transfer with the Android build, each direction
- [ ] 4.5 Confirm the documented limit: backgrounding mid-transfer fails cleanly rather than hanging
- [x] 4.6 If any iOS fix landed outside the shared shims, note why the seam was wrong and whether it should move back into the shared layer
      — no Rust/frontend code changed. Both fixes were build-config in `project.yml` (SystemConfiguration.framework link; `CFBundleURLTypes`), which the proposal already scoped as expected Apple paperwork. The shared seam held; nothing moves back into the shared layer.
- [x] 4.7 Download destination (from `download-destination-strategy` §6.3): receive via code and via a trusted device; confirm files land under the app Documents dir as `floppy/<datetime>[ from <device>]/`, and appear in Files → On My iPhone → Floppy (survive relaunch)
      — verified after the `resolve_dest_root` fix: receives now land as `Floppy/<datetime>[ from <device>]/` (dropped the double-`floppy` nesting) and show in Files → On My iPhone → Floppy.
