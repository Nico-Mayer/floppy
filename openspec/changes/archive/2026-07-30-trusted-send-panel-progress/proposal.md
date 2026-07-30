# Trusted send panel: show progress and completion

## Why

A trusted-device send moves bytes and finishes correctly on the backend
(`Done{Send}` fires — verified), but the send panel is stuck on "waiting for a
yes" the whole time and shows no progress. The only sign the transfer finished
is the completion toast.

Root cause is frontend state, not transport. The trusted send enters the panel
via `beginTrusted`, which sets `status = 'starting'`. Unlike a quick-share send,
the trusted path (`start_send`) emits **no** `Code` event, so nothing moves the
panel off `'starting'`:

- `Progress{Send}` events are dropped — the handler only applies them when
  status is already `'waiting'` or `'sending'`.
- `PairingAccepted` only toasts; it never advances the panel.

So the panel jumps from "waiting for a yes" straight to done at the very end,
with no accepted state and no progress bar in between.

## What Changes

- On `PairingAccepted`, the send panel leaves "waiting for a yes" and shows the
  accepted/connecting state.
- `Progress{Send}` events advance a trusted send that is still in its pre-send
  state, so the progress bar and byte counts show as the transfer runs.
- Completion (`Done{Send}`) continues to land the panel on the sent screen.

No transport change — `Done{Send}` already fires; this is state handling in the
send panel only.

## Capabilities

### Modified Capabilities

- `transfer-panel-layout`: the send panel drives its accepted → sending → done
  states for a trusted send from the events it actually receives.

## Impact

- `src/lib/transfer-app.svelte.ts`: `SendTransfer.accepted()`; broaden the
  `Progress{Send}` guard to advance from the pre-send state.
- `src/lib/pairing-app.svelte.ts`: `PairingAccepted` advances the send panel.
