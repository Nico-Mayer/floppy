# Unify Frontend UX

## Why

The frontend grew screen by screen, and it shows: the same kinds of moments (waiting, failing, finishing) look different depending on which screen you're on. A send-to-device failure toasts while a send-by-code failure shows an inline alert on the same screen; pairing actions (accept, rename, remove, confirm) give no in-flight feedback at all; the "getting files ready" indicator is implemented twice at two sizes; completion screens are copy-pasted near-twins; and pairing success is a silent list bump. The app also rotates freely on phones even though every layout is designed portrait-first. Unifying these into one feedback vocabulary makes the app feel native and predictable instead of stitched together.

## What Changes

- **One feedback vocabulary** (new capability): a single, named system for the four feedback moments — pending (spinners at fixed sizes, busy buttons with inline spinner + label swap), blocked (disabled with a reason), failed (one policy for toast vs inline alert, decided by where the user's attention is), and succeeded (completion screens and success signals). Every screen adopts it.
- **Pending feedback for every async action**: pairing actions (accept, decline, send-to, confirm, rename, remove) currently fire-and-forget; each gets visible in-flight state through the shared busy-button pattern.
- **Consolidate duplicated UI into shared components**: one `TransferComplete` (replaces the SendComplete/ReceiveComplete twins), one empty-state hero (ReceiveIdle vs SendQueue duplicates), one copy-with-confirmation control (SendCode vs CodePanel duplicates), one "getting files ready" indicator (SendPanel vs SendQueue duplicates).
- **Consistent motion**: extend the existing motion vocabulary (`motion.ts`, pop/shake/bob keyframes) so every panel state change and overlay uses the same entrance/exit timing; add life to moments that currently jump-cut (pairing success, list arrivals). All decorative motion keeps collapsing under reduced motion.
- **Pairing success becomes visible**: a paired device arriving gets an animated arrival plus a success signal instead of a silent count bump.
- **Portrait lock on phones**: iPhone and Android phones lock to portrait (iOS via `project.yml`, Android via `android:screenOrientation`); iPad keeps rotation. Desktop is unaffected.

## Capabilities

### New Capabilities

- `feedback`: the app-wide feedback vocabulary — how the UI shows pending, blocked, failed, and succeeded states; which surface (toast, inline alert, dialog, completion screen) each kind of news uses; and the shared primitives that enforce it.

### Modified Capabilities

- `device-management`: pairing and device actions gain visible in-flight state; a successful pairing gets a visible, animated confirmation instead of a silent list update.
- `interaction`: state-change motion becomes a spec'd vocabulary — panel state entrances, overlay open/close, and list arrivals share timing and easing from one source; decorative/informative reduced-motion split unchanged.
- `app-platform`: phones lock to portrait orientation; tablets and desktop keep current behavior.

## Impact

- **Frontend only, plus platform config.** No Rust command/event changes, no broker changes, no IPC contract changes.
- `src/lib/components/` — new shared components (busy button pattern, TransferComplete, empty hero, copy control, pending indicator); edits across send/*, receive/*, devices/* to adopt them.
- `src/lib/pairing-app.svelte.ts`, `src/lib/transfer-app.svelte.ts` — expose per-action pending state for the UI to bind.
- `src/lib/motion.ts`, `src/routes/layout.css` — motion vocabulary extensions.
- `src-tauri/gen/apple/project.yml` (portrait lock; Info.plist is regenerated from it) and `src-tauri/gen/android/app/src/main/AndroidManifest.xml` (`android:screenOrientation="portrait"`, keeping the auto-generated plugin blocks intact).
- Existing specs `app-shell`, `transfer-panel-layout`, `preview-markers` are respected but their requirements do not change.
