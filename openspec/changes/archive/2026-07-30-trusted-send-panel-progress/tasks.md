# Tasks: trusted-send-panel-progress

## 1. Send panel state

- [x] 1.1 `transfer-app.svelte.ts`: `SendTransfer.accepted()` — leave `'starting'` for the accepted/connecting state
- [x] 1.2 `transfer-app.svelte.ts`: `Progress{Send}` advances a trusted send still in its pre-send state (include `'starting'`), so the progress bar shows
- [x] 1.3 `pairing-app.svelte.ts`: `PairingAccepted` calls `app.send.accepted()`
- [x] 1.4 Confirm `Done{Send}` still lands the panel on the sent screen (unchanged)
