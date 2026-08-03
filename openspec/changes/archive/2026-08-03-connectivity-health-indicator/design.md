## Context

Two pieces of network have to work before a transfer can start, and the app already knows
the state of both:

- **Relay.** `Manager::new_with_publish` builds an iroh `Endpoint` and spawns
  `endpoint.online()` to warm it (`transport/manager.rs:230`). `online()` is itself a thin
  loop over `Endpoint::home_relay_status()`, a `Watcher<Vec<RelayStatus>>` where each entry
  answers `is_connected()` and `last_error()`. The watcher is stable API in iroh 1.0.3 and
  lives for as long as any `Endpoint` clone does. Nothing but the warm-up reads it.
- **Broker.** `pairing/broker.rs` owns one background task that connects, registers, and
  reconnects with 1s→30s backoff. A disconnect is `tracing::debug!` and nothing else
  (`broker.rs:84`); a successful registration is `tracing::info!` (`broker.rs:123`).

Neither reaches the frontend. `src/routes/send/+page.svelte` and `receive/+page.svelte`
render `PageHeader` with a `status` string derived purely from transfer phase, so a device
on a relay-blocking VPN shows an ordinary idle Send screen and only learns the truth from a
`connect` transfer error after a person has picked files and waited.

Constraints that shape the design:

- The transport core imports no UI and no Tauri (`transport/event.rs:1`); it reports through
  an injected `Emitter`.
- The IPC contract is generated from `specta_builder()` (`lib.rs:525`); nothing is
  hand-written on the frontend.
- `cargo test` is hermetic: transport tests run `RelayConfig::DisableRelay` on loopback with
  no network, and one shared in-process mock serves the broker's `/ws` and `/fp`.
- `PageHeader` has exactly one trailing action slot, and on Send it is already occupied by
  the big-transfer warning tooltip (`send/+page.svelte:28`).

## Goals / Non-Goals

**Goals:**

- One coalesced truth about relay and broker reachability, readable as a snapshot and
  watchable as changes, so a screen that mounts mid-session is never wrong.
- A quiet, honest indicator in the Send and Receive top bars: invisible when fine, one icon
  plus a plain-language explanation when not.
- Never a false alarm on launch. A cold start has no relay for a second or two by design.
- No new dependency, no new cargo feature, no change to the transport core's UI-free rule.

**Non-Goals:**

- Gating transfers on health. Two devices on one wifi transfer fine with no relay at all,
  and the typed transfer errors stay the only authority on a real failure.
- Probing `GET /health` on the broker. The `/fp` socket is a live proof of reachability for
  the same host; a second probe would add a timer and a second thing to disagree with.
- iroh's net report (`unstable-net-report`), NAT class, direct-vs-relayed path, latency.
- Any surface outside the two transfer top bars: no sidebar dot, no Devices banner, no
  toast, no notification.
- Per-peer reachability. "Is that device online" is the existing `Unreachable` signal's job.

## Decisions

### One health type in its own module, not two independent events

A new `src-tauri/src/health.rs` owns a `Health` handle: a small `Arc<Mutex<Snapshot>>` plus
a sink, with `set_relay(..)` / `set_broker(..)` setters that dedupe (a set to the value it
already holds emits nothing) and a `snapshot()` reader. `lib.rs` builds it, `app.manage()`s
it for the snapshot command, and gives the sink a closure that emits the specta event.

Alternative considered: two events, one from the transport and one from pairing, combined on
the frontend. Rejected because the snapshot command would then have two sources to read and
the frontend would hold the only merged copy, which is exactly the split that lets a
mid-session mount show half the truth.

### The transport core exposes the watcher; `lib.rs` owns the loop

`Manager` gains one accessor returning the endpoint's home-relay status watcher. The task
that maps it onto `Health` lives in `lib.rs`, next to the other app wiring.

Alternative considered: give `Manager` the `Health` handle and let it drive the watch task
itself. Rejected to keep `transport/` free of anything but its own `Emitter` contract, which
is the rule that makes the hermetic transport tests possible. The accessor is also directly
testable: a `DisableRelay` manager can be asserted to report no connected relay.

### Broker state rides the pairing plumbing that already exists

`Incoming` gains a link variant that `broker.rs` sends when registration is acked and when
`serve_once` returns an error; the `PairingService` incoming loop forwards it as a
`PairingEvent`, and the `TauriPairingEmitter` in `lib.rs` routes it into `Health` instead of
to the webview.

Alternative considered: a second sink argument on `PairingService::new` and on
`broker::connect`. Rejected because it threads a new dependency through two constructors to
carry a bool that the existing one-way channel already has room for. The trade-off is that
`PairingEvent` grows a variant that is not a pairing event in the UI sense; the emitter, not
the service, is where that distinction is resolved, and it is resolved in one match arm.

### Snapshot command plus change event, both generated

One new command (`health`) returning the snapshot and one new event (`HealthEvent`) carrying
the same shape, both registered in `specta_builder()`. The frontend store reads the snapshot
once on start and then applies events; the event payload is the whole snapshot, not a delta,
so a dropped event cannot desync the store.

### Three-state per link, and a startup grace window

Each link is `up`, `down`, or `unknown`. `unknown` is the launch value and renders nothing.

`home_relay_status()` returns an empty vec both before a home relay has been picked and when
relays are configured off, so an empty vec on its own cannot mean "down". The relay link
therefore stays `unknown` until either a status entry says connected (`up`) or a bounded
grace window from endpoint construction elapses with nothing connected (`down`). The broker
link needs no window: a failed connect attempt is an unambiguous answer, so it goes `down`
on the first `serve_once` error and `up` on a register ack.

Once a link has been `up`, later transitions are immediate in both directions. The window is
a launch concession, not a debounce.

### The routes compose the header's one trailing slot

`PageHeader` keeps its single `action` snippet, but the slot stops meaning "one control" and
starts meaning "the trailing edge, whatever the route puts there". A new shared
`src/lib/components/shell/ConnectionWarning.svelte` renders the icon plus its tooltip, and
each transfer route's snippet renders it. On Send it sits leading of the big-transfer
warning, because "you have no connection" outranks "this one is big". The heading keeps
owning placement, spacing, and the reserved row height, so nothing about the bar moves.

Alternative considered: a dedicated `health` prop on `PageHeader`. Rejected because the bar
is on every destination and this concern is on two of them; a prop would put transfer-only
knowledge in the shell's one shared header.

Alternative considered: hide the big-transfer warning while a connection warning shows, to
keep the slot at literally one control. Rejected because both facts are true at once and
dropping one to satisfy a spec sentence is the wrong direction of fix.

### Copy

Plain, no jargon, one thing to try, no em dashes. The words "relay" and "broker" never
appear in UI text.

- Both down: "No connection right now. Check your wifi, or turn off your VPN."
- Relay only: "Floppy can't reach the internet. A VPN or firewall is the usual cause.
  Sending to a device on the same wifi can still work."
- Broker only: "Codes and saved devices need a connection, and we don't have one yet.
  Still trying."

## Risks / Trade-offs

- **A launch-time warning flashes before the relay connects** → the relay link starts
  `unknown` and renders nothing; it can only go `down` after the grace window with nothing
  connected.
- **A VPN toggling flaps the indicator** → the setters dedupe, so only real transitions emit.
  The watcher itself only updates when a status actually changes.
- **`RelayConfig::DisableRelay` would report a permanent "down"** → that config exists only
  in tests, which assert on the snapshot rather than render it. Documented on the accessor
  so nobody wires a relay-less production config and then chases a phantom warning.
- **Tooltip on a touch screen** → Send's big-transfer warning already uses
  `Tooltip.Trigger` as a focusable button with an `aria-label`, so this follows a precedent
  that ships. If tap-to-open turns out unreliable on device, the fix is to swap the shared
  component's disclosure for a popover, which is why the tooltip lives inside
  `ConnectionWarning` and not in the routes.
- **A healthy indicator invites the reading "so a transfer will work"** → the tooltip says
  what still works (same-wifi sending) rather than promising anything, and nothing about
  starting a transfer changes. The existing typed errors keep owning failure.
- **The broker link says nothing about the `/ws` mailbox** → same host, same TLS path, so a
  dead `/fp` is near-certainly a dead `/ws`. Accepted; a separate probe is a non-goal.
- **`PairingEvent` carries a non-pairing variant** → contained to one arm of the emitter's
  match, and noted there. The alternative was two extra constructor parameters.
