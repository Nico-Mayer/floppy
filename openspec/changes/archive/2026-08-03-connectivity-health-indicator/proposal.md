## Why

Floppy needs two pieces of network reachable before a transfer can happen: iroh's relay
(for discovery and holepunch fallback) and the broker (for the code mailbox and for
fingerprint routing between trusted devices). Today the app knows the state of both
internally and tells nobody: the iroh endpoint keeps a live home-relay connection status,
and the pairing broker client reconnects in a backoff loop, but neither leaves Rust. On a
VPN that blocks the relay, Send and Receive look completely normal until a transfer is
attempted and fails minutes later with a generic connect error.

The fix is to surface what is already known: a quiet warning in the Send and Receive top
bars that says which piece is not connected, before the user commits to a transfer.

## What Changes

- Expose the iroh endpoint's home-relay connection state out of the transport core. The
  endpoint already tracks it; the Manager watches it and reports changes through the same
  injected `Emitter` it uses for transfer events.
- Expose the pairing broker client's connection state (registered vs. disconnected, with
  a retry in flight) out of `pairing/broker.rs`, which today logs disconnects at `debug`
  and keeps them to itself.
- Add one health event and one snapshot command to the IPC contract, so a screen that
  mounts mid-session starts from the truth instead of waiting for the next change.
- Add a frontend health store fed by that event plus the snapshot on start.
- Render a quiet indicator in the Send and Receive top bars: nothing when both pieces are
  connected, a small warning icon with a tooltip naming what is down and the one thing to
  try when either is not.
- Health is reported, not enforced: a degraded state SHALL NOT block starting a transfer.
  A relay-less local network can still transfer directly, and the existing typed transfer
  errors stay the authority on an actual failure.

Not in scope, deliberately: probing the broker's `GET /health` endpoint (the `/fp` socket
already proves reachability), iroh's net report / NAT classification (needs the unstable
`unstable-net-report` cargo feature), and surfacing health anywhere outside the two
transfer top bars.

## Capabilities

### New Capabilities

- `connectivity-health`: what "connected" means for the relay and for the broker, how each
  state is observed and reported to the frontend, the snapshot-plus-changes contract, and
  the rule that health informs but never gates a transfer.

### Modified Capabilities

- `transfer-panel-layout`: the Send and Receive top bar gains one more thing it can show,
  including what the bar looks like when everything is fine (nothing).
- `app-shell`: the shared heading's trailing edge is specified as exactly "one action", and
  on Send that is already the big-transfer warning. It becomes one trailing slot the route
  fills, with the heading still owning placement, spacing, and the row's unchanging height.
- `rendezvous-broker`: the client rendezvous connection requirement grows an obligation to
  expose its connection state, not just its stream of signals.

## Impact

- `src-tauri/src/transport/manager.rs` — watch `Endpoint::home_relay_status()` in a
  background task; report transitions through the `Emitter`.
- `src-tauri/src/transport/event.rs`, `src-tauri/src/events.rs` — one new event in the
  vocabulary (health is not a transfer event, so it carries no `id`/`kind`).
- `src-tauri/src/pairing/broker.rs`, `src-tauri/src/pairing/service.rs` — the fp client
  reports connected/disconnected as its background loop turns over.
- `src-tauri/src/lib.rs` — one new command in `specta_builder()`, wiring the two watchers
  to the app emitter.
- `src/lib/ipc/bindings.ts` — regenerated (never hand-edited).
- `src/lib/` — new health store; `src/routes/send/+page.svelte` and
  `src/routes/receive/+page.svelte` plus one shared indicator component under
  `src/lib/components/shell/`.
- Tests: `cargo test` in `src-tauri/` (hermetic — the existing `DisableRelay` config is
  itself a "no relay" case, and the shared in-process broker mock can be stopped to drive
  a disconnect), `go test -race ./...` unchanged.
- No new dependencies. `iroh` 1.0.3 already exposes `home_relay_status()` on stable API.
