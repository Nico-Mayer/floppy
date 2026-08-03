# Extend haptic moments

## Why

Haptics today fire only for moments the user causes with their own finger (copy, remove,
accept, decline, scan) plus transfer completion. Nothing fires when something *arrives* —
an incoming offer, a pairing request, a failure, a "they said yes" — which is exactly when
a phone in the hand should be felt, because the user was not looking at the screen waiting
for it. The plugin, permission, and the never-fail wrapper already exist; this change only
widens the list of moments.

## What Changes

- New haptic moments, all fired from the existing `haptics` module (frontend only):
  - **Offer arrival** — an incoming transfer offer (`pairingOfferEvent`) or a pairing
    confirm request (`pairingRequest`) appears: warning-weight notification haptic.
    This is the "something arrived for you" buzz.
  - **Pairing completed** (`pairingPaired`): success-weight haptic, same note as a
    finished transfer.
  - **Peer said yes** (`pairingAccepted`, sender side): medium impact — the wait is over
    and bytes are about to move.
  - **Failure** — a mid-transfer `errorEvent`, a `pairingError`, or a peer decline
    (`pairingDeclined`): error-weight notification haptic, one note for all of them.
  - **Pull-to-refresh trigger** — a light impact the moment the pull crosses the trigger
    distance, so the finger knows release will commit (standard platform pattern).
- Arrival and outcome haptics fire only while the app is visible in the foreground. A
  backgrounded arrival is the OS notification's job, and the OS already vibrates for
  notifications by its own settings; buzzing twice for one event is noise.
- Everything else holds: coarse-pointer gate, never-fail, not suppressed by
  reduced-motion, ordinary taps stay silent.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `interaction`: the "Touch feedback fires at the moments that carry meaning" requirement
  gains the arrival, outcome, and pull-trigger moments (its current list is closed with
  "and nowhere else", so widening it is a spec change). A foreground-visibility condition
  is added for haptics driven by backend events rather than by a tap.

## Impact

- `src/lib/haptics.ts` — new named moments (arrived, paired, peerAccepted, failed,
  pullTriggered) and the visibility gate for event-driven ones.
- `src/lib/pairing-app.svelte.ts` — fire on offer/request arrival, paired, accepted,
  declined, pairing error.
- `src/lib/transfer-app.svelte.ts` — fire on `errorEvent`.
- `src/lib/actions/pull-to-refresh.svelte.ts` — fire on trigger crossing.
- `src-tauri/capabilities/mobile.json` — the existing `haptics:default` grant was
  invalid: the plugin ships no `default` permission set (its ACL manifest has
  `default_permission: None`), so every haptic call on device was denied and silently
  swallowed by `feel()`. Replaced with explicit `haptics:allow-impact-feedback` and
  `haptics:allow-notification-feedback`. Already fixed alongside this proposal.
- No Rust or IPC changes: `tauri-plugin-haptics` is already initialized mobile-only in
  `lib.rs`.
