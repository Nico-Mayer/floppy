## Context

The transport core is a single `Manager` per app: at most one live send and one live receive, each reporting through an injected `Emitter`. Send is passive — files are imported into the blob store as a collection, a ticket is handed out, and the iroh Router serves fetches. Send progress and completion are derived entirely from the provider event stream (`RequestMode::NotifyLog`) in `provider_pump` (`manager.rs`): completion fires only when `served_content && total > 0 && content >= total`.

iroh-blobs is content-addressed (BLAKE3) and resumes by hash from the on-disk `FsStore`. A receiver only requests the byte ranges it lacks. So when the receiver already holds the content (same file sent before, or a resumed partial), the bulk fetch moves fewer bytes than `total` — sometimes zero — and `content` never reaches `total`. The receiver's stream still ends and it emits `Done`, but the sender's byte counter never trips `finish_send`: the send slot lives forever with no terminal event. That is the "sender never catches done" report.

Two adjacent latency problems ride along. Trusted-device offers go out only after `send_to` → `start_send` → `wait_for_addr` (up to ~5s warming the endpoint to a ticket-ready address), even though the receiver does not dial until it accepts. And a backgrounded receiver gets no OS notification for an offer (only transfer _completion_ notifies), so the prompt is effectively invisible until focus. Underneath both, neither broker WebSocket channel has a heartbeat, so idle sockets die silently behind NAT/proxy and offers land late or as false "device offline".

Signalling already exists for trusted devices: the `Signal` enum (`Offer`, `Response`) rides the `/fp` fingerprint channel, verified against the trust store. Quick-share/code transfers have no persistent back-channel — the `/ws` mailbox is closed right after the sealed-ticket handoff.

## Goals / Non-Goals

**Goals:**

- A passive send reaches `Done` whenever the receiver actually got the content, regardless of how many bytes crossed the wire (dedup/resume included).
- Exactly one terminal event per send; no double `Done`, no false `Done` from a forged completion.
- Offers surface to the receiver promptly and reach a backgrounded user via an OS notification.
- Idle broker connections stay registered; dead ones are evicted fast.
- A stuck or never-accepted send frees its slot and pins on a TTL.

**Non-Goals:**

- Changing the transfer wire protocol or iroh-blobs itself.
- Persisting transfer history (separate concern).
- Adding delivery receipts to the UI beyond the existing done state.
- Reworking the single-send/single-receive slot model.

## Decisions

### Completion is authoritative from the receiver, not inferred from bytes

The receiver is the only party that knows it has the full content. After `do_receive` exports successfully, the receiver sends an explicit completion signal; the sender finishes the send on that. Byte-count completion (`content >= total`) stays as a fast path — whichever fires first wins, and the send is idempotently finished once (guard on the slot id, same pattern as the existing `finish_send` / `Aborted` handling).

- **Trusted devices**: add `Signal::Completed(Response)` (or a dedicated `Completion` struct) carrying the receiver's public identity + transfer id, signed and verified against the trust store exactly like accept/decline. The sender's `incoming_loop` (`service.rs`) maps a verified completion for a pending send to `manager` finishing that send and emitting `Done`. Reuses the whole `/fp` path — no new transport.
- **Quick-share / code**: keep the `/ws` mailbox open one extra frame after the sealed-ticket handoff. The receiver, after export, sends one sealed "done" frame under the PAKE-derived key; the sender `recv()`s it (bounded by a timeout) and finishes. The broker relays it opaquely — no broker change for this half. Binding it under the AEAD key is the authentication.

Alternative considered — _complete on the download request finishing (zero-byte requests included) from the provider stream_: rejected as the sole mechanism because full dedup can send **no** GET request at all, so the provider sees nothing. Kept only as the existing fast path for the fresh-transfer case.

Alternative considered — _sender polls the receiver / keeps a QUIC stream open for an ack_: rejected; the broker back-channel already exists and avoids holding a second connection open on the passive side.

### Offer emission decoupled from endpoint warm-up

Surface the offer to the receiver as soon as it verifies; do not gate it on the sender's `wait_for_addr`. Preferred approach: warm the endpoint at app startup (kick address discovery when the `Manager` is built) so by the time a user sends, `endpoint.addr()` is already ticket-ready and `wait_for_addr` returns immediately — this keeps the current "ticket is inside the signed offer" shape intact and needs no protocol change. `wait_for_addr` stays as a bounded safety net. (A larger alternative — send the offer first and deliver the ticket only on accept — is noted as an open question; it changes the offer/response protocol and is not required to fix the observed latency.)

### OS notification on incoming offer

Reuse the existing `notify_done` pattern in `lib.rs`: on `PairingEvent::Offer`, if the main window is not focused, raise a notification ("wants to send you …") off the main thread. Same focus check, same non-blocking `run_on_main_thread` queueing that the completion notification already uses (so it does not stall the transport task on the UI loop).

### Broker heartbeat

Both Go channels (`mailbox.go`, `fproute.go`) send periodic WebSocket pings and set a read deadline reset on any frame/pong; a connection that misses the deadline is closed and its per-connection state (fingerprint registration / room slot) is freed. Clients (`pairing/broker.rs`, `rendezvous/client.rs`) respond to pings (tokio-tungstenite auto-pongs) and the long-lived `/fp` client additionally keeps itself warm. This is standard WS keepalive; the value is detecting dead sockets instead of relaying into them.

### Send-slot TTL

Give `SendSlot` a creation instant and a "last progress" instant. A background timer (or a check when a new send is requested) expires a send that has served past the TTL with no completion and no recent progress: cancel its token, drop the slot and pins, emit **no** `Done`. Active sends (recent progress) are exempt. TTL is generous (minutes) so a slow human accepting an offer is never cut off.

## Risks / Trade-offs

- **Double completion (byte-count fast path races the ack)** → idempotent finish guarded by slot id; the second trigger is a no-op (mirrors existing `finish_send`).
- **Quick-share ack never arrives (receiver crashes post-export)** → sender falls back to byte-count completion (fresh transfers) or the send-slot TTL; the extra `recv()` is bounded by a timeout so the sender never blocks forever.
- **TTL expires a send a human was slowly accepting** → TTL sized in minutes and reset by any progress; acceptance dials and produces progress well before expiry.
- **Heartbeat adds broker traffic** → pings are infrequent (tens of seconds); negligible next to transfer signalling.
- **New `Signal` variant is a wire change** → the broker relays signals opaquely, so only the two Rust endpoints need to understand it; an older peer that never sends `Completed` still completes via the byte-count path or TTL. Regenerates `bindings.ts` only if a new frontend event is added (completion is internal; the frontend already handles `DoneEvent`).

## Migration Plan

1. Land the receiver→sender completion signal (trusted first, then quick-share) behind the existing idempotent finish. Byte-count path stays, so no regression for fresh transfers.
2. Add the OS offer notification and endpoint warm-up (pure additions).
3. Add the send-slot TTL.
4. Add broker heartbeat + client keepalive; deploy broker via `broker/Dockerfile`. Old clients keep working (heartbeat is server-driven; clients auto-pong).

Rollback: each step is independent. Reverting the completion signal returns to byte-count-only completion (the current behavior). Reverting the broker heartbeat is a broker-only redeploy.

## Open Questions

- Should the offer carry the ticket at all, or should the ticket be delivered on accept (fully decoupling offer latency from endpoint state)? Deferred — startup warm-up fixes the observed latency without a protocol change.
- Exact TTL value and whether expiry should surface anything to the sender's UI (today it would just silently free the slot). Leaning: silent, matching cancel semantics.
