# harden-transfer-lifecycle — design

## Context

Two independent failure families, one theme: the happy path is solid, every abandonment path is silent.

**Trusted-device cancel.** `cancel_send` calls `Manager::cancel(Kind::Send)` and nothing else. The receiver's prompt survives (60s `OFFER_PROMPT_TTL`), `PairingService.outgoing` is never cleared (a stale response still emits `Accepted`), a fresh offer to the same device is auto-declined "busy" by the ghost prompt, and an accept after cancel still transfers everything — the iroh Router serves whatever is in the blob store, the store has no in-session GC, and dropped pins change nothing until relaunch.

**Code rendezvous.** `rendezvous_receive` has no timeout (`mailbox.recv().await` unbounded; the frontend comment admits "a receive waits for its peer forever"). `rendezvous_send` is one-shot: after delivering the sealed ticket it waits for a completion frame, and *any* frame that does not open under the session key ends the wait and drops the mailbox. So a receiver's first failed attempt (typo with matching digits) permanently orphans the code; the retry hangs forever. The sender's WebSocket also dies ~40s after backgrounding (broker ping 30s + 10s timeout) and is never rejoined, and a malformed PAKE frame from a stray joiner errors `handshake.finish` and fails the whole send.

Constraints: broker stays a dumb relay (no protocol change); errors stay typed (no prose matching); the shared in-process mock broker is the only wire mock; iroh-blobs 0.103 keeps blob deletion and GC private.

## Goals / Non-Goals

**Goals:**

- Cancelling an unanswered trusted offer dismisses it on the receiver and cleans up sender-side pairing state.
- A code receive always terminates: success, typed failure, or user cancel. Never an infinite silent "connecting".
- A quick-share code stays redeemable for the send's whole life: across failed attempts, garbage frames, and broker reconnects.
- A cancelled send stops honouring new fetch requests.

**Non-Goals:**

- Cancelling an in-flight pairing-code redemption (deferred 2026-08-01, separate flow).
- Broker (Go) protocol or behaviour changes.
- Retracting an already-posted OS notification for a revoked offer (the in-app prompt is dismissed; a stale notification tap just opens an app with no prompt).
- Cutting off a fetch that is already streaming when cancel lands (today's documented "in-flight receiver may still finish" stays).
- Resume across restart, or any store lifecycle change.

## Decisions

### D1: `Signal::Revoked` carries a signed revocation

New variant alongside `Offer`/`Response`/`Completed`: a `Revocation { transfer_id, ... }` signed by the sender's identity, mirroring `Completion` in `pairing/offer.rs`. Verified against the trust store before acting, so a forged revoke cannot dismiss someone else's prompt.

*Alternative — unsigned `{ transfer_id }` blob:* simpler, but every other signal on `/fp` is signed and verified; an unsigned one would be the lone spoofable message and would need its own justification forever.

### D2: `cancel_send` routes through the pairing service, which owns revocation

The `cancel_send` command gains the `PairingService` state alongside `Manager`. It calls `PairingService::cancel_outgoing()` first: if `outgoing` is `Some`, send `Signal::Revoked` for that transfer id, clear `outgoing`, then `Manager::cancel(Kind::Send)`. With no outgoing offer (code send, or already answered) it degrades to today's manager-only cancel.

Clearing `outgoing` fixes two secondary defects for free: a stale `Response` no longer matches (no spurious `Accepted`), and glare bookkeeping cannot reference a dead offer.

*Alternative — new `revoke_offer` command called by the frontend before `cancel_send`:* two IPC calls that must happen in order, enforced only by frontend discipline. One command doing both is unmissable.

### D3: Receiver handles revoke by dropping the pending offer and emitting one event

`incoming_loop` gets a `Signal::Revoked` arm: verify, `pending.remove(transfer_id)`. If something was actually removed, emit a new `PairingEvent::Revoked { transfer_id }` → new IPC event `PairingRevoked`. Frontend: if the current prompt matches, clear it and toast ("They stopped the send." voice-checked copy). If the user already accepted (offer gone from `pending`), the revoke is a no-op — the transfer proceeds, which matches the sender-side race window (see R3).

Accept racing revoke: `accept` already fails with "no such incoming offer" when `pending` lost the id; the existing error path in `pairing-app.svelte.ts` lands it inline on the Receive panel. Copy gets softened for this case.

### D4: Receiver rendezvous is wrapped in one timeout

Wrap the whole of `rendezvous_receive` (join → PAKE → sealed ticket) in `tokio::time::timeout(RENDEZVOUS_TIMEOUT)`, 30s. On expiry, emit `Event::Failed` with `TransferErrorCode::Timeout` and copy in the app voice: what happened plus the one thing to try (check the code, make sure the other device is still showing it). The 15s `tooSlow` hint stays as the early nudge; the timeout is the floor under it.

The fetch/export phase after rendezvous keeps its existing failure handling — the timeout covers only the exchange, which is the phase that can hang without any event.

*Alternative — per-`recv` timeouts like `redeem_pair_code`:* more code for the same user outcome; the exchange is three round-trips that either complete in seconds or never.

### D5: Sender rendezvous becomes a session loop with a key ring

Restructure `rendezvous_send` from one-shot to a loop that lives until the send's `done` token fires:

```
loop (select against done):
  frame = mailbox.recv()
  1. try pake::open under each key in the ring → completion ack → finish_send, return
  2. else treat as a new attempt's first PAKE message:
       fresh pake::start; finish; on error IGNORE frame, continue
       seal ticket under the new key, send, push key onto the ring
  on mailbox error: reconnect (D6)
```

- A failed receiver attempt no longer consumes the exchange — the next join gets a fresh PAKE.
- A malformed frame is skipped, not a send-killing error.
- The key ring (all keys derived this send; bounded small) lets a completion sealed under an *earlier* attempt's key still finish the send — a successful receiver holds its mailbox open until after the fetch, so a later attempt can only exist if that receiver's socket dropped, and its completion may still arrive by the byte-count path anyway.

Wrong-code attempts still learn nothing: each attempt seals the ticket under that attempt's PAKE key, exactly as today; the NodeId-binding property is untouched.

*Alternative — single current key, drop old ones:* simpler, but silently breaks the completion ack for the (rare) receiver whose mailbox dropped mid-fetch; the ring costs a few 32-byte keys.

### D6: Sender mailbox reconnects while the send is live

First join keeps today's semantics: if it fails, the code is undeliverable — emit `Failed` and unwind the send. After a successful first join, any mailbox error enters a reconnect loop (capped exponential backoff, ~1s → 15s), racing the send's `done` token. A "room full" rejection (our own zombie connection not yet evicted; broker frees it within ~40s via keepalive) is just another retry.

This is what fixes the pocket-the-phone case on resume: the OS suspends the process, the socket dies, and the next loop iteration after resume rejoins the room. While suspended nothing can be done client-side, and that is acceptable — the receiver's 30s timeout (D4) now gives honest feedback instead of a hang.

### D7: A cancelled send refuses new fetch requests via provider request gating

Switch the provider `EventMask` for `get`/`get_many` from `NotifyLog` to the request-gating mode (`RequestMode::Rpc` family in iroh-blobs 0.103), and answer each incoming request from the slot table: live, non-cancelled send → allow; otherwise → deny. The progress/completion pump keeps consuming the same per-request update stream it does today.

This closes "cancelled ticket still fetchable all session" for both trusted and code sends. Requests already streaming when cancel lands are not cut off (non-goal, unchanged behaviour).

*Alternatives considered:* deleting the blobs (API private in 0.103, documented in `manager.rs`); rebuilding the Router/BlobsProtocol per cancel (heavy, disrupts the endpoint). If the Rpc-mode reply plumbing turns out not to support a clean allow/deny at this API level, fallback is documented-limitation (revoke + mailbox drop already remove every path to the ticket for a peer that does not hold it yet) — but gating is the intended fix. Validate this API corner first during implementation (see tasks).

### D8: Error vocabulary is reused, not extended

The rendezvous timeout reports as the existing `TransferErrorCode::Timeout`; Rust owns the sentence. No new `CommandError` variant: accept-after-revoke surfaces through the existing "no such incoming offer" failure with friendlier copy. The only IPC surface change is the new `PairingRevoked` event (and regenerated bindings).

## Risks / Trade-offs

- **[R1] `RequestMode::Rpc` gating is an unverified API corner of iroh-blobs 0.103** → task order puts a spike first; fallback is shipping revoke + rendezvous fixes with the serve-gate as documented limitation rather than blocking the whole change.
- **[R2] Reconnect loop can mask a genuinely dead broker** → backoff caps at ~15s and the loop races the send's `done`/TTL (300s), so a dead broker costs at most the send's natural lifetime, and the receiver side now times out honestly either way.
- **[R3] Revoke/accept race** → sub-second window; both ends degrade gracefully (receiver: typed failure on accept; sender: stale response ignored because `outgoing` is cleared). No distributed agreement attempted.
- **[R4] Stale OS notification after revoke** → not retracted (non-goal); tapping it opens the app with no prompt, which is the same dead-end as an expired offer today.
- **[R5] Key ring keeps ticket-sealing keys for the send's lifetime** → keys are per-attempt session keys for content the send is deliberately serving; bounded count, dropped with the task.
- **[R6] 30s receiver timeout may fire on genuinely slow networks** → the exchange is three tiny round-trips through one WebSocket; if the broker round-trip takes 30s, the subsequent QUIC fetch was not going to work either. Retry is one tap (the code is kept).
