# Tasks: receive-clipboard-detect

## 1. Detection logic (ReceivePanel.svelte)

- [x] 1.1 Import `Clipboard` from `@wailsio/runtime` in `ReceivePanel.svelte` and add local state: `filled: string | null`, `dismissed: string | null` (Svelte 5 `$state`)
- [x] 1.2 Implement `checkClipboard()`: no-op unless `app.mode === 'receive'`; `await Clipboard.Text()` in try/catch (rejection → no-op, no error surfaced); trim result; act only on anchored match `^\d+-\w+-\w+-\w+$`, otherwise drop the value
- [x] 1.3 Wire triggers: `$effect` reading `app.mode` (fires `checkClipboard()` when it becomes `'receive'`) and `<svelte:window onfocus={checkClipboard} />` — no polling anywhere

## 2. Auto-fill + provenance UI (ReceivePanel.svelte)

- [x] 2.1 Auto-fill: on match, set `receive.code = code` and `filled = code`, gated by `receive.status === 'idle'` ∧ `code !== dismissed` ∧ (`receive.code` empty ∨ `receive.code === filled`) — never overwrite user-typed input, never auto-start
- [x] 2.2 Provenance hint row below the input, shown while `filled !== null && receive.code === filled`: `IconClipboard` + "from clipboard" in `text-muted-foreground`, plus ghost icon-button ✕ that clears the input and sets `dismissed = filled`
- [x] 2.3 Animate hint enter/leave with `fly` using `$lib/motion` `normal()`/`shift()`, matching the error alert pattern in `App.svelte`

## 3. Verify

- [x] 3.1 `wails3 dev`, native window: copy `1234-alpha-beta-gamma` → switch to Receive tab → input pre-filled, "from clipboard" hint visible, receive not started; Enter starts it
- [x] 3.2 Native window: typing over the fill keeps the edit and hides the hint; ✕ clears and same value never re-fills, new code re-arms; refocus on Send tab does not read; no fill while receive is connecting/receiving; newer clipboard code replaces an unmodified fill
- [x] 3.3 Browser preview at :9245 (no Wails runtime): Receive tab input stays empty, no error surfaced
- [x] 3.4 Negative matches: unrelated clipboard text, code embedded in a sentence, 3-segment code → no fill
- [x] 3.5 `go test -race ./...` stays green (no Go changes expected — sanity gate)
