# Design: receive-clipboard-detect

## Context

Receiving requires typing/pasting a croc code into the input in `ReceivePanel.svelte` (`frontend/src/lib/components/transfer/ReceivePanel.svelte:113`). Codes almost always arrive via another app, so the clipboard usually already holds the code when the user lands on the Receive tab.

Current state:

- Tabs are shadcn-svelte `Tabs.Root` in `App.svelte:75` bound to `app.mode` (`'send' | 'receive'`); ⌘1/⌘2 also switch modes. Both `Tabs.Content` panels stay mounted — switching tabs does not remount `ReceivePanel`, so `onMount` cannot serve as the trigger.
- The Wails native clipboard is already used on the send side: `SendPanel.svelte:12` imports `Clipboard` from `@wailsio/runtime` and calls `Clipboard.SetText` (native path chosen there because `navigator.clipboard` has secure-context/permission quirks inside webviews). Reading uses the same module: `Clipboard.Text()`.
- Receive state lives in `ReceiveTransfer` in `frontend/src/lib/transfer-app.svelte.ts`; the input is enabled only in `status === 'idle'`.
- The browser preview at :9245 has no Wails runtime — `Clipboard.Text()` rejects there.

## Goals / Non-Goals

**Goals:**

- Zero-friction path: clipboard code → input already filled when the user arrives → Enter.
- Read the clipboard only at discrete, user-initiated moments (tab focus, window focus) — never poll.
- Never surface non-code clipboard content anywhere in the UI or logs.

**Non-Goals:**

- Auto-starting the receive on detection (user keeps the explicit Start step).
- Persisting dismissals across app restarts.
- Backend/Go changes, new events, or binding regeneration.
- Send-side clipboard behavior (unchanged).

## Decisions

### 1. Trigger: `$effect` on `app.mode` + window `focus`, no polling

Detection runs when (a) `app.mode` becomes `'receive'`, and (b) the window regains focus while the Receive tab is active. Implemented inside `ReceivePanel.svelte` with an `$effect` reading `app.mode` and a `<svelte:window onfocus>` handler, both funneling into one `checkClipboard()`.

- _Why not `onMount`_: `Tabs.Content` keeps panels mounted; mount fires once per app run.
- _Why not polling_: reading the clipboard on a timer is a privacy smell and wasted work; the two chosen moments cover "copied code, then opened/switched to Floppy" — the actual user flow.
- _Why in `ReceivePanel` and not `transfer-app.svelte.ts`_: the store is UI-framework state around transfers; clipboard sniffing is presentation-adjacent behavior with no cross-component consumers. Keeping it in the panel keeps the store's surface unchanged. Local `$state` in the component holds `detected: string | null` and `dismissed: string | null`.

### 2. Read via `Clipboard.Text()` from `@wailsio/runtime`, failures are silent

Same module the send side already imports. The call is wrapped in `try/catch`; any rejection (notably the :9245 browser preview, or a platform denial) results in "no chip", never an error surface. No `navigator.clipboard.readText()` fallback — read permission prompts inside webviews are exactly the quirk the send side avoided, and a missing chip is a non-event.

### 3. Match: anchored `^\d+-\w+-\w+-\w+$` on trimmed text

The croc default code shape (`1234-word-word-word`). Anchored so arbitrary clipboard text containing a code-like substring does not trigger — false positives cost more than false negatives here (chip showing someone's unrelated text pattern feels like surveillance). Matching happens locally in the component; the clipboard value is stored only when it matches, and non-matching text is dropped immediately.

- _Why not reuse backend validation (`minCodeLen`/`normalizeCode`)_: that validation is deliberately loose (any ≥6 chars) to allow custom codes; the chip should only fire on high-confidence croc-shaped codes.

### 4. Auto-fill with visible provenance, not an offer chip

_(Supersedes the earlier chip design after UX review — the chip still cost a click and floated awkwardly above the input.)_

A detected code is written straight into the code input. Fill happens only when: `status === 'idle'` ∧ pattern match ∧ value ≠ `dismissed` ∧ (input empty ∨ input still equals the previous unmodified auto-fill). User-typed text is never overwritten; a _newer_ clipboard code may replace an _unmodified older_ auto-fill.

- **Provenance hint**: while the input value equals the auto-filled value, a small row below the input shows a clipboard icon + "from clipboard" and a ghost ✕ clear button. The user must be able to see the value did not come from their own hands — silent injection into a field that starts a network action would be spooky and error-prone.
- **Clear (✕)** → empties the input and sets `dismissed` to that value; the same clipboard value is never re-filled this session, a _new_ code re-arms auto-fill. Typing over the fill just edits normally — the hint disappears because the value no longer equals the fill.
- **No auto-start** — the user still presses Receive/Enter. Auto-fill removes the transcription step, not the consent step.
- State: `filled: string | null` (last auto-filled value), `dismissed: string | null` — both local `$state` in `ReceivePanel`. Hint condition: `filled !== null ∧ receive.code === filled`.
- UI: hint row uses `text-muted-foreground` text + `IconClipboard`, ghost icon-button ✕; enters/leaves with the app's existing `fly` motion (`$lib/motion` `normal`/`shift`), matching the error alert in `App.svelte:86`.
- _Why not the chip / inline InputGroup addon / toast_: all three still require a click to move the code into the input, and the chip additionally shifts layout. Auto-fill is the only option that fulfills the proposal's "removes the most common interaction entirely"; the guard conditions plus visible provenance remove the surprise factor that usually argues against auto-fill.

## Risks / Trade-offs

- [Clipboard read on focus may trigger OS paste indicators on future OS versions (Windows/macOS currently silent for native reads)] → reads happen only on explicit tab/window focus, so any indicator correlates with user action; acceptable.
- [`$effect` on `app.mode` also fires on the initial run when the app starts on the send tab] → guard `checkClipboard` on `app.mode === 'receive'` so the initial run is a no-op unless Receive is active.
- [User copies a new code while the window is already focused on the Receive tab] → not detected until next focus/tab switch. Accepted: covering it needs polling, and the manual paste path still works.
- [Codes with non-default shapes (custom codes, non-4-segment)] → no chip; manual paste unaffected. Deliberate per Decision 3.
