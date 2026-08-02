# Tasks: Unify Frontend UX

## 1. Feedback primitives

- [x] 1.1 Add named size scale to `ui/spinner` (`inline` | `control` | `panel` mapping to the three sizes in use) and migrate every feature-component spinner call site off raw `size-*` classes
- [x] 1.2 Add the busy-button treatment (disables, swaps in inline spinner, shows pending label) and migrate the hand-rolled busy buttons in `CodePanel` and `EnterCodeDialog` to it. *Built as `feedback/BusyButton` composing Button + Spinner instead of patching a prop into the vendored `ui/button` — see design D1.*
- [x] 1.3 Create `feedback/PendingHint` absorbing `WaitingHint` and the duplicated "getting files ready" block; use it from `SendPanel`, `SendQueue`, and the former `WaitingHint` call sites; delete the duplicates
- [x] 1.4 Create `feedback/CopyButton` (icon swap + `copied` timeout + `copied` haptic); use it in `SendCode` and `CodePanel`; delete both inline implementations

## 2. Shared screens and states

- [x] 2.1 Create `feedback/TransferComplete` from the better of `SendComplete`/`ReceiveComplete`; replace both; verify send and receive completion visually on desktop and one phone width
- [x] 2.2 Create `feedback/EmptyHero` (mascot + compact/regular container-query layout); use it from `ReceiveIdle` and `SendQueue`; delete the duplicated hero markup
- [x] 2.3 Add skeleton rows shaped like `DeviceRow` for the device list's initial load, using the vendored `ui/skeleton`

## 3. Pending state for device actions

- [x] 3.1 Add a reactive pending-set to `pairing-app.svelte.ts` (keyed `action:fingerprint`, entered/left around each await in `accept`, `decline`, `sendTo`, `confirmPair`, `rename`, `untrust`, and self-rename)
- [x] 3.2 Bind the pending-set to the busy-button prop in `DeviceRow`, `SelfDeviceCard`, `IncomingPairDialog`, `IncomingOfferDialog`, and the remove confirmation in `devices/+page.svelte`, so no device action is double-firable or silent

## 4. Failure-surface policy

- [x] 4.1 Route `sendTo` failure into `app.send.error` (inline in the Send panel) instead of a toast; keep the typed-error copy from `describeError`
- [x] 4.2 Audit every `toast.error`/`toast.info` call site against the policy (inside-the-flow inline, background toast); move any stragglers; confirm no action reports through two surfaces
- [x] 4.3 Give the `DeviceList` "pairing unavailable" line the shared blocked-reason treatment (one line near the blocked add control, ordinary voice) instead of a bare `<p>`

## 5. Motion vocabulary

- [x] 5.1 Audit feature components for hard-coded transition durations; move every literal onto `fast()`/`normal()` from `motion.ts`
- [x] 5.2 Add the `arrive` keyframe (motion into place + brief self-decaying highlight) to `layout.css`, with the reduced-motion collapse to fade-plus-highlight, alongside `pop`/`shake`/`bob`
- [x] 5.3 Apply `arrive` to a newly paired device's row (user-caused arrival only, not initial render) and to files joining the send queue; verify the existing `accepted` haptic still fires on pairing completion

## 6. Portrait lock

- [x] 6.1 iOS: set iPhone orientations to portrait-only in `src-tauri/gen/apple/project.yml` (iPad keeps all four); run an iOS build so xcodegen regenerates `Info.plist`; commit both
- [x] 6.2 Android: add `android:screenOrientation="userPortrait"` to the activity in `AndroidManifest.xml`, outside the AUTO-GENERATED blocks
- [ ] 6.3 Verify rotation: iOS simulator stays portrait, Android emulator stays portrait, iPad simulator still rotates

## 7. Verification

- [x] 7.1 Grep gates: no raw spinner sizes in feature components, no literal transition durations, no `toast.error` for in-flow failures
- [ ] 7.2 Walk both transfer flows (code send, device send, receive) and the pairing flow on desktop + one phone target; confirm pending, failure, and success feedback match the spec scenarios; confirm reduced-motion behavior for `arrive` and busy buttons
- [x] 7.3 `npm run check` (svelte-check) and existing test gates pass; UI copy in new strings follows the config voice rules
