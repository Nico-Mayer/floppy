## 1. Health state in the core

- [x] 1.1 Add `src-tauri/src/health.rs` with a `Link` state (`up` | `down` | `unknown`) and a
      `Snapshot { relay, broker }`, both `Serialize`/`Type` so they can cross the IPC boundary
      unchanged.
- [x] 1.2 Add a cheap-to-clone `Health` handle over that snapshot: `set_relay`, `set_broker`,
      `snapshot`, plus a sink invoked on change. Both setters dedupe, so a set to the state
      already held returns without calling the sink.
- [x] 1.3 Give `Health` the launch grace window for the relay link: a `relay_down_after`
      deadline set at construction, and a `mark_relay_settled()`-style path so an
      observed-but-not-connected relay only becomes `down` once the deadline has passed, and
      `up` at any time short-circuits it. Once the link has ever been `up`, the window no
      longer applies.
- [x] 1.4 Declare `mod health;` in `lib.rs` and unit-test the handle in `health.rs`: dedupe
      emits once, the whole snapshot is reported (not a delta), `unknown` is the launch state,
      the window suppresses an early `down` but not a later one.

## 2. Relay observation

- [x] 2.1 Add an accessor on `Manager` returning the endpoint's home-relay status watcher
      (`Endpoint::home_relay_status()`), documented with the `RelayConfig::DisableRelay`
      caveat from design.md so nobody reads a test config as a production warning.
- [x] 2.2 Add a hermetic test in `manager.rs`: a `DisableRelay` manager reports no connected
      relay through the accessor, and the accessor is readable without a network.
- [x] 2.3 In `lib.rs`, spawn the task that watches that stream and maps it onto
      `Health::set_relay`: any entry `is_connected()` means `up`, otherwise let the grace
      window decide. The task ends when the endpoint's last clone drops.

## 3. Broker observation

- [x] 3.1 Add a link variant to `pairing::broker::Incoming` and send it from `serve_once`:
      registered on the `ok` ack, disconnected when the function returns an error while `run`
      still intends to retry. Reconnects report registered again. Reconnect/backoff behaviour
      is unchanged.
- [x] 3.2 Forward the variant through the `PairingService` incoming loop as a `PairingEvent`
      link variant, with a comment saying why it rides this stream (design.md) and that the
      emitter, not the service, decides it never reaches the webview.
- [x] 3.3 In `lib.rs`, handle that variant in `TauriPairingEmitter` by calling
      `Health::set_broker` instead of emitting to the frontend.
- [x] 3.4 Extend the existing shared in-process broker mock test to cover it: registering
      against the mock reports the link up, and stopping the mock (or closing the socket)
      reports it down. Reuse the one mock; do not add a second.

## 4. IPC contract

- [x] 4.1 Add a `HealthEvent` to `src-tauri/src/events.rs` carrying the whole snapshot, with a
      doc comment noting it is not a transfer event and so carries no `id`/`kind`.
- [x] 4.2 Add a `health` command returning the snapshot from the managed `Health`.
- [x] 4.3 Register both in `specta_builder()`, build `Health` in `setup` with a sink that emits
      `HealthEvent` through the app handle, and `app.manage()` it before the commands can be
      called.
- [x] 4.4 Regenerate `src/lib/ipc/bindings.ts` (`cargo test export_bindings`) and confirm the
      new command and event appear without hand-editing the file.
- [x] 4.5 `cargo test` in `src-tauri/` green; `cargo fmt` and `cargo clippy` clean for the new
      code.

## 5. Frontend state

- [x] 5.1 Add `src/lib/health.svelte.ts`: a `$state` class holding both links, `listen()`
      wiring `events.healthEvent` in the transfer-app/pairing-app pattern, and a start path
      that reads the `health` snapshot once so a mid-session mount is never wrong.
- [x] 5.2 Derive the presentation state on the store: whether to warn at all, and the one line
      to show for both-down, relay-only, and broker-only. Copy exactly as agreed in design.md,
      no infrastructure words, no em dash.
- [x] 5.3 Start it from `src/routes/+layout.svelte`'s `onMount`, beside `app.listen()`, and
      return its unlisten with the others.

## 6. The indicator

- [x] 6.1 Add `src/lib/components/shell/ConnectionWarning.svelte`: renders nothing unless the
      store says warn, otherwise a warning-tinted icon in a `Tooltip.Trigger` with an
      accessible name and the store's line as the content. Sized to match Send's existing
      big-transfer warning so the row height is untouched.
- [x] 6.2 Render it in `src/routes/receive/+page.svelte` through the header's trailing slot
      (the route has no action snippet today, so add one).
- [x] 6.3 Render it in `src/routes/send/+page.svelte` leading of the big-transfer warning in
      the same snippet, both visible when both apply.
- [x] 6.4 Update `PageHeader.svelte`'s prop doc to describe the trailing slot as the route's
      group rather than exactly one control, matching the app-shell delta, and keep the
      reserved row height as it is.

## 7. Verification

- [x] 7.1 `cargo test` in `src-tauri/`, `go test -race ./...` in `broker/`, `npm run check`,
      and `prettier --write .` on touched frontend files all clean.
- [x] 7.2 On desktop in the native window with the app running normally: no warning in either
      top bar, and the bar height matches a screenshot taken before the change.
- [x] 7.3 With the broker unreachable (point `FLOPPY_BROKER_URL` at a dead host, or stop
      `mise run broker` under `FLOPPY_BROKER=local`): the broker warning appears on both
      screens within a few seconds, and clears on its own once the broker is back.
- [x] 7.4 On a relay-blocking VPN, or with relay traffic blocked at the firewall: the relay
      warning appears after the grace window and not before, and a transfer between two
      devices on the same wifi still starts and still completes with the warning showing.
- [x] 7.5 On a phone (iOS or Android): the warning's tooltip opens by tap, the compact one-row
      bar does not wrap or grow, and the warning survives backgrounding and returning.
- [x] 7.6 Toggle a link down and up several times while a transfer screen is open: the icon
      appears and disappears with no layout shift, and nothing below the bar moves.
