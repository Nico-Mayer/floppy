## 1. Completion signal — trusted devices

- [x] 1.1 Add a `Completed` signal variant (receiver public identity + transfer id, signed) to `pairing/signal.rs` and `pairing/offer.rs`, with sign + verify helpers mirroring accept/decline responses.
- [x] 1.2 In `manager.rs`, add a `Manager` entry point that idempotently finishes a live send by id (reuse `finish_send`; no-op if the slot is gone or has a different id) and emits the terminal `Done`.
- [x] 1.3 After `do_receive` exports successfully on the trusted path, send the signed `Completed` signal to the sender over `/fp` (thread the sender fingerprint / offer into `run_receive` or `receive_from`).
- [x] 1.4 In `service.rs` `incoming_loop`, verify a `Completed` signal against the trust store and call the manager's finish-send-by-id for the matching pending send.
- [x] 1.5 Rust test: a trusted transfer where the receiver already holds all blobs (pre-seeded store) still drives the sender to exactly one `Done`.

## 2. Completion signal — quick-share / code

- [x] 2.1 Keep the `/ws` mailbox open one extra frame after the sealed-ticket handoff in `rendezvous_send`; `recv()` a bounded, PAKE-sealed "done" frame and finish the send by id.
- [x] 2.2 In `rendezvous_receive` / the code receive path, after export send one sealed "done" frame under the derived key, then close.
- [x] 2.3 Ensure byte-count completion and the ack are idempotent (whichever fires first finishes once; the other is a no-op) and the extra `recv()` timeout never hangs the send.
- [x] 2.4 Rust test: a code transfer with a pre-seeded receiver store (zero/partial bytes) still completes the sender.

## 3. Send-slot TTL

- [x] 3.1 Track a creation instant and a last-progress instant on `SendSlot`; update last-progress when the tracker emits.
- [x] 3.2 Expire a send that has passed the TTL with no completion and no recent progress: cancel, drop slot + pins, emit no `Done`. Exempt actively-progressing sends.
- [x] 3.3 Rust test: a send that is never fetched expires and frees the slot for a new send; an actively-progressing send is not expired.

## 4. Prompt offer surfacing + OS notification

- [x] 4.1 Warm the endpoint at `Manager::new` (kick address discovery) so `wait_for_addr` returns immediately by send time; keep `wait_for_addr` as a bounded safety net.
- [x] 4.2 In `lib.rs`, raise an OS notification on `PairingEvent::Offer` when the main window is unfocused, reusing the non-blocking `notify_done` pattern (off the main thread, focus-gated).
- [x] 4.3 Verify offer copy follows the UI voice rules (no em dash, plain wording) and the focused case shows only the in-app prompt.

## 5. Broker heartbeat + client keepalive

- [x] 5.1 Add periodic WebSocket ping + read-deadline eviction to `broker/fproute.go`; free the fingerprint registration on close.
- [x] 5.2 Add the same heartbeat + read-deadline eviction to `broker/mailbox.go`; free the room slot on close.
- [x] 5.3 Confirm `pairing/broker.rs` and `rendezvous/client.rs` respond to pings (auto-pong) and the `/fp` client stays warm across the heartbeat interval.
- [x] 5.4 Go tests (`go test -race ./...`): an idle-but-responsive connection survives past the deadline window; a silent connection is evicted and its slot is immediately reusable.

## 6. Single transfer session (send XOR receive)

- [x] 6.1 Replace the per-kind `Slots { send, recv }` reservation with a single atomic session guard so a send and a receive can never both be active; keep the `SendSlot`/`RecvSlot` payloads but gate claiming either on the session being idle.
- [x] 6.2 Make `start_send` / `claim_receive` (and the quick-share/accept entry points) reserve the session atomically and return the stable "transfer already running" busy error when occupied; extend `await_free_slot` to cover a globally-unwinding session (`Unwinding`).
- [x] 6.3 Ensure an outgoing offer waiting for accept (trusted) and a shown quick-share code hold the session until resolved or expired.
- [x] 6.4 Rust tests: send blocks a new receive and vice versa; session frees on terminal event; unwinding still blocks; waiting-for-accept blocks a receive.
- [x] 6.5 Frontend: confirm `errors.ts` maps "transfer already running" for both directions and the panels present it sanely (no double-panel state).

## 7. Busy offer handling + glare tiebreaker

- [x] 7.1 Add a decline reason (`manual` | `busy`) to the response in `pairing/offer.rs` / `signal.rs`; keep signing/verification intact.
- [x] 7.2 In `service.rs` `incoming_loop`, when the device is busy (active session or a pending offer prompt already held), auto-send a signed busy decline and do not emit `PairingEvent::Offer` (so no prompt, no notification). Enforce a single pending prompt.
- [x] 7.3 Add the glare check: if an offer arrives from the exact fingerprint this device is currently offering to, apply the fingerprint tiebreaker — lower fp keeps its offer and busy-declines; higher fp cancels its own send and surfaces the incoming offer.
- [x] 7.4 Give the pending offer prompt a bounded TTL that frees the reservation, so an unanswered offer never wedges the device busy.
- [x] 7.5 Sender side: map a busy decline to distinct user copy ("the other device is busy, try again later") in `pairing-app.svelte.ts` / `errors.ts`, separate from a user decline.
- [x] 7.6 Rust tests: offer during active transfer is busy-declined with no prompt; second offer while a prompt is pending is busy-declined; glare resolves to exactly one transfer (lower fp sends, higher fp receives); a non-target concurrent offer is a plain busy-decline.

## 8. Wiring, generation, and gates

- [x] 8.1 Wire any new command/event into `specta_builder()` and regenerate `src/lib/ipc/bindings.ts` (`cargo test export_bindings`); handle a new frontend event only if one was added.
- [x] 8.2 Run `cargo test` in `src-tauri/` and `go test -race ./...` in `broker/`; fix fallout.
- [x] 8.3 Live E2E sanity: `mise run test:live` for a trusted transfer and a code transfer, including a repeat send of the same file (dedup path) to confirm the sender reaches `Done`.
- [x] 8.4 Run `openspec validate harden-transfer-delivery` and reconcile any spec/task drift.
