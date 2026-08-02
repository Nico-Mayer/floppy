# Design: Unify Frontend UX

## Context

The frontend has one spinner primitive, one toast library, and one motion module, yet every screen composes them differently. An inventory of the current tree found:

- **Pending states**: eight spinner call sites at five different sizes; the "getting files ready" indicator implemented twice (`SendPanel.svelte` at `size-4`, `SendQueue.svelte` at `size-6`); pairing actions (`accept`, `decline`, `sendTo`, `confirmPair`, `rename`, `untrust` in `pairing-app.svelte.ts`) with **no** in-flight feedback at all.
- **Failure surfaces**: three idioms — inline `Alert` (`TransferError`), `toast.error` (all pairing/device failures), and a plain `<p>` (`DeviceList` when pairing is unavailable). The same Send screen reports failure two different ways: a code send failure sets `app.send.error` (inline alert), a device send failure toasts (`pairing-app.svelte.ts:191`).
- **Success**: no success toasts anywhere by design (success is a state change), but pairing success is a *silent* state change — the new row just appears.
- **Duplication**: `SendComplete`/`ReceiveComplete` are near-identical; the mascot empty-hero exists twice (`ReceiveIdle`, `SendQueue`); the copy-with-checkmark control exists twice (`SendCode`, `CodePanel`).
- **Motion**: `motion.ts` (fast/normal/shift) plus `pop`/`shake`/`bob` keyframes are a good start, but feature components also hard-code durations, and list arrivals (a newly paired device) jump-cut.
- **Orientation**: nothing is locked. iOS allows portrait + both landscapes (`gen/apple/project.yml:45-53`); Android has no `screenOrientation` so it rotates freely. Every layout in the app is designed portrait-first at 500px-ish widths.

Constraints: shadcn-svelte first (vendored components carry six local patches — modify carefully); Svelte 5 runes; the UI copy voice in `openspec/config.yaml`; existing specs `app-shell`, `transfer-panel-layout`, `interaction`, `preview-markers` must keep holding; no Rust/IPC changes.

## Goals / Non-Goals

**Goals**

- One named vocabulary for the four feedback moments — pending, blocked, failed, succeeded — enforced by shared primitives, not per-screen discipline.
- Every async user action shows in-flight state from press to settle.
- One failure-surface policy a screen can be checked against.
- Pairing success is seen, not inferred.
- One implementation for each currently-duplicated pattern.
- Motion timing/easing comes from one source; new-arrival moments get life.
- Phones are portrait-only.

**Non-Goals**

- No new Rust commands, events, or error variants; the typed error contract is untouched.
- No redesign of screen layouts, navigation, or the two-zone transfer card; this change standardizes feedback inside the existing structure.
- No new animation library; `motion.ts`, CSS keyframes, Svelte transitions, and the existing `motion-sv` border-beam are enough.
- No skeleton-first rewrite of every list; skeletons are adopted only where a list genuinely loads (device list startup), which the `interaction` spec already asks for.

## Decisions

### D1: A `feedback` module of primitives, not a rule document

New `src/lib/components/feedback/` holding the shared primitives, mirroring how `interaction` puts the 44px minimum inside the button primitive instead of asking call sites to remember it:

- **Busy button**: a `feedback/BusyButton` wrapper that composes the shared `Button` with an inline `Spinner` — while `pending` it disables itself, swaps its content for the spinner beside the pending label. *(Deviation from the first draft, which patched a `pending` prop into the vendored `ui/button`: the shadcn-svelte guidance is explicit that Button carries no loading prop and busy states are composed from Spinner inside Button, and a wrapper keeps the vendored file stock — no new local patch to re-apply after component updates.)*
- **Spinner size tokens**: the spinner gets named sizes (`inline`, `control`, `panel`) replacing raw `size-*` classes at call sites. Three sizes cover every current use (3.5/4 → inline, 5/6 → control, 8 → panel).
- **`PendingHint`**: absorbs `WaitingHint` (inline spinner + mono label) and the duplicated "getting files ready" block; `SendPanel` and `SendQueue` both render it.
- **`CopyButton`**: the copy-with-checkmark-swap control (icon scale transition + `copied` timeout + haptic), used by `SendCode` and `CodePanel`.
- **`TransferComplete`**: one completion screen (Empty + `animate-pop` check + entrance fade) taking title/description/action snippets; replaces `SendComplete` and `ReceiveComplete`.
- **`EmptyHero`**: the mascot + compact/regular container-query hero, used by `ReceiveIdle` and `SendQueue`.

### D2: Failure-surface policy — "where the user is looking"

One rule, spec'd in the new `feedback` capability:

- A failure of the flow the user is *inside* (a transfer starting or running, a code being redeemed in an open surface) reports **inline in that surface** — the existing per-panel `TransferError`, the error line in `EnterCodeDialog`/`ScanSheet`.
- A failure of a **background or fire-and-forget action** (rename, remove, confirm-pair, copy, an event arriving while elsewhere) reports as a **toast**.
- Consequence: `sendTo` failure stops toasting and instead sets `app.send.error`, so the Send panel reports every send failure the same way regardless of target. This is the one behavior change to existing reporting; everything else is codification.
- Success stays a state change, never a toast — unchanged philosophy, now written down. Alternative considered: success toasts everywhere (common in web apps) — rejected because the app already has completion screens and list arrivals; toasting on top would double-report.

### D3: Per-action pending state lives in the app-state classes

`pairing-app.svelte.ts` gains a small reactive pending-set (`$state` `SvelteSet<string>` keyed by `action:fingerprint`) that each async method enters/leaves around its `await`. UI binds `pending.has(...)` to the busy-button prop. Chosen over per-component local state because three components trigger the same actions (row, dialog, panel) and the state must survive the component unmounting (a drawer closing mid-request).

### D4: Motion — one source, two additions

- Feature components stop hard-coding durations; every `duration:` in a transition reads `fast()`/`normal()` from `motion.ts` (audit shows most already do; the stragglers get fixed).
- **List arrival**: a shared `arrive` treatment (fade + slight rise + brief background highlight, ~1s decay) for a row that appears because of something the user did — used by the paired-device list when a pairing completes, and by send-queue tiles. Implemented as a keyframe in `layout.css` + `animate-arrive` class, decaying to plain fade under reduced motion like `pop` does.
- **Pairing success**: the closing surface (already spec'd to close on success) is followed by the new row's `arrive` highlight plus the existing `accepted` haptic. No completion dialog — the row *is* the result, and highlighting it teaches where the result lives. Alternative (a success dialog/toast) rejected per D2.

### D5: Portrait lock

- **iOS**: edit `src-tauri/gen/apple/project.yml` — iPhone orientations become portrait-only; iPad keeps all four (it has the space for landscape and Apple review dislikes portrait-locked iPads). `Info.plist` is regenerated by xcodegen from `project.yml`, so the plist is never edited directly (regen gotcha: run the iOS build once so xcodegen rewrites it, then commit both).
- **Android**: add `android:screenOrientation="userPortrait"` to the activity in `AndroidManifest.xml`, outside the AUTO-GENERATED plugin blocks. `userPortrait` over `portrait` so users with the OS-level auto-rotate-to-face setting keep it. Android has no clean phone/tablet split in the manifest; the app locks portrait on all Android devices, accepted because there is no tablet layout to defend.
- **Desktop**: untouched (fixed-size window already).

### D6: Skeleton where a list actually loads

The vendored `ui/skeleton` is currently dead code. The device list's initial load adopts skeleton rows shaped like `DeviceRow` (the `interaction` spec already requires "placeholder rows resembling those items rather than a centred spinner"). No other surface gets skeletons — transfer panels are state machines, not loading lists.

## Risks / Trade-offs

- [Touching the vendored `ui/button` risks drifting from upstream shadcn-svelte and colliding with the six known local patches] → keep the `pending` prop purely additive, document it beside the existing `touch` prop, and re-check the vendored-patch list in memory after any future component update.
- [Centralizing `sendTo` errors into `app.send.error` could show a transfer error on the Send panel while the user is on another screen] → the existing behavior already routes the app to the Send screen on offer/accept flows; the error binds to the panel the user lands on, and `BottomNav` already shows the failed-dot for unseen errors.
- [Portrait lock on Android applies to tablets too] → accepted; no tablet layout exists. If one arrives, switch to a resource-qualified orientation.
- [Refactoring six components into shared ones can change pixel output subtly] → each consolidation keeps the current markup of the *better* twin and is verified visually on desktop + one phone width before moving on.
- [xcodegen regenerates the pbxproj; hand edits there are lost] → all iOS changes go through `project.yml` only.

## Migration Plan

Pure frontend + config change; no data, no protocol. Land as one change, componentization first (no visual change intended), then policy changes (sendTo error routing, pending states), then motion, then orientation. Rollback is `git revert`; the Android manifest and `project.yml` edits are self-contained.

## Open Questions

- None blocking. If Apple review objects to iPad rotation asymmetry it does not, this is the recommended shape, revisit in the release-hardening change.
