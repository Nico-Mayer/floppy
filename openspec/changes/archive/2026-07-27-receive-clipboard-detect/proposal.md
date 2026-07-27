# Proposal: receive-clipboard-detect

## Why

Receiving a file today means the user copies a croc code from a chat/email, opens Floppy, clicks the Receive input, and pastes manually. That copy-paste round trip is the single most common interaction in the app. If the clipboard already holds a code, the app can offer it in one click.

## What Changes

- When the Receive tab gains focus (user switches to it, or the window regains focus while it is active), the app reads the clipboard via the native Wails `Clipboard.Text()` API.
- If the clipboard text matches the croc code shape (`\d+-\w+-\w+-\w+`), the code is **auto-filled into the empty code input**, with a small "from clipboard" provenance hint and a clear button below the input. Zero clicks — the user just presses Receive/Enter.
- Auto-fill never overwrites user input: it only fills when the input is empty or still holds an unmodified earlier clipboard fill. It never auto-starts the receive.
- Auto-fill is suppressed when: a receive is in progress, or the user cleared that exact clipboard value (per-value, session-only dismissal).
- No new backend code — `Clipboard.Text()` is provided by the Wails runtime; the send side already uses the same module (`Clipboard.SetText`).

## Capabilities

### New Capabilities

- `receive-clipboard-detect`: Detect a croc code on the system clipboard when the Receive tab is active and auto-fill it into the empty code input with visible provenance and one-click undo.

### Modified Capabilities

<!-- none — no existing specs; backend receive behavior is unchanged -->

## Impact

- **Frontend only**: `frontend/src/lib/components/transfer/ReceivePanel.svelte` (chip UI + clipboard read trigger), `frontend/src/lib/transfer-app.svelte.ts` (receive state, if detection state lives there).
- **Wails runtime**: uses `Clipboard.Text()` from `@wailsio/runtime` — same module already imported in `SendPanel.svelte` for `SetText`.
- **No Go changes**, no new events, no binding regeneration.
- **Privacy note**: the app reads the clipboard only on Receive-tab focus, matches locally, and never transmits or stores the value; only a matching code is ever shown.
- Browser preview at :9245 has no Wails bindings — `Clipboard.Text()` rejects there; the feature must degrade silently (no chip, no error).
