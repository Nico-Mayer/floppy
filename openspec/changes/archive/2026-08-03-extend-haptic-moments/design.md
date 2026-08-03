# Design: extend-haptic-moments

## Context

Haptics are already a working subsystem: `tauri-plugin-haptics` is initialized mobile-only
in `src-tauri/src/lib.rs`, `capabilities/mobile.json` grants `haptics:default`, and
`src/lib/haptics.ts` wraps every call in a coarse-pointer gate plus a never-fail `feel()`
helper. Call sites exist for copy, scan, remove, transfer-done, accept, decline.

What's missing is everything the user did not cause with their own finger: an offer
arriving, a pairing completing, a failure, the other device saying yes. Those all surface
today as typed Tauri events handled in two stores (`transfer-app.svelte.ts`,
`pairing-app.svelte.ts`), so the wiring points already exist and are singletons — no risk
of double-firing from multiple mounted components.

The Rust side already suppresses OS notifications while the app is foregrounded (offer and
completion notifications fire only when unfocused). Haptics are the exact complement: felt
in the foreground, silent in the background where the OS notification takes over.

## Goals / Non-Goals

**Goals:**

- Fire haptics for arrival and outcome events, weighted by meaning.
- Fire a light tick when pull-to-refresh crosses its trigger, once per touch.
- Keep the whole mapping of moment → intensity in `haptics.ts` alone.
- Never buzz twice for one event (foreground haptic XOR background OS notification).

**Non-Goals:**

- No Rust changes. The plugin fires from JS; the event flow is untouched.
- No haptic settings UI. The OS-level haptic strength control is the setting.
- No haptics for navigation, button presses at large, drawer opens, or toasts in general —
  the restraint rule ("a buzz on everything stops meaning anything") stands.
- No custom vibration patterns (`vibrate(ms)`); only the plugin's semantic feedback API,
  so each platform renders its native texture.

## Decisions

**1. New moments stay moment-named, mapping lives in `haptics.ts`.**
Extend the existing object with `arrived`, `paired`, `peerAccepted`, `failed`,
`pullTriggered`. Call sites keep reading as what happened; intensity tuning stays a
one-file edit. Alternative — passing intensities at call sites — rejected: that is how the
vocabulary erodes.

Intensity mapping:

| moment | plugin call |
| --- | --- |
| `arrived` (offer / pairing request appears) | `notificationFeedback('warning')` |
| `paired` | `notificationFeedback('success')` |
| `peerAccepted` | `impactFeedback('medium')` |
| `failed` (transfer error, pairing error, declined) | `notificationFeedback('error')` |
| `pullTriggered` | `impactFeedback('light')` |

**2. Foreground gate is a `document.visibilityState === 'visible'` check inside the
event-driven moments.** Implemented as a second wrapper in `haptics.ts` (e.g.
`feelVisible()`), used by `arrived` / `paired` / `peerAccepted` / `failed`; finger-driven
moments keep plain `feel()`. Checking on the JS side mirrors where the call is made and
avoids a round-trip; the Rust `is_focused()` approach is both async-hostile (see the
notification code's own comments) and unnecessary here. On mobile a backgrounded webview
is usually frozen anyway, so the gate is cheap insurance rather than the primary
mechanism — which is exactly why it must be a silent check, never an error path.

**3. Event haptics fire from the stores, not from components.** The listeners in
`pairing-app.svelte.ts` (`pairingOfferEvent`, `pairingRequest`, `pairingPaired`,
`pairingAccepted`, `pairingDeclined`, `pairingError`) and `transfer-app.svelte.ts`
(`errorEvent`) are each subscribed exactly once for the app's lifetime. A dialog component
can be mounted, unmounted, or replaced without dropping or doubling a buzz. This matches
where `transferDone` already fires (`doneEvent` listener in the store).

**4. One failure note.** `errorEvent`, `pairingError`, and `pairingDeclined` (including
the busy variant) all fire `failed`. A decline is milder news than a mid-flight failure,
but giving it its own weight grows the vocabulary for a distinction nobody will feel;
the toast copy already carries the nuance. Cancel stays silent: a local cancel emits no
terminal event by design, and the user's finger already knows what it did.

**5. Pull trigger is an edge latch in the action.** `pull-to-refresh.svelte.ts` tracks a
`triggered` boolean per touch; `pullTriggered` fires on the first false→true crossing and
the latch re-arms only when the touch ends. Firing on every re-crossing turns a wobbling
finger into a rattle.

## Risks / Trade-offs

- **[Double alert if Rust's focus check and JS visibility disagree]** — e.g. window
  focused but hidden, or vice versa. → Both checks fail toward silence in their own
  domain: Rust skips the notification only when focused, JS skips the haptic only when
  hidden. The overlap window is tiny and the worst case is one redundant buzz, not a
  crash.
- **[Android emulator has no vibrator; iOS simulator ignores haptics]** — on-device
  verification only. → Verification tasks call for a real phone; everything else is
  covered by type-checking and the never-fail wrapper.
- **[Plugin API drift]** — `notificationFeedback('warning')` support varies by platform
  version. → All calls go through `feel()`, which swallows both rejection and error
  results; a missing texture degrades to nothing, never to a failure.
- **[The never-fail wrapper hides real misconfiguration]** — proven by history: the
  capability granted `haptics:default`, which the plugin does not define (no default
  permission set), so every call was permission-denied and `feel()` ate it. Nothing
  buzzed and nothing complained. → Permissions fixed to the explicit
  `haptics:allow-impact-feedback` / `haptics:allow-notification-feedback`; the on-device
  verification task exists precisely because desktop and type checks cannot catch this
  class of failure. Verified during apply: an android `cargo check` passes with the
  invalid `haptics:default` too, so build-time validation is no safety net either —
  the editor schema diagnostic and the runtime ACL are the only tripwires.

## Open Questions

None. All wiring points exist; the change is additive.
