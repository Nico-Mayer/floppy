# harden-transfer-lifecycle

## Why

Every abandonment path in the transfer flow is silent today, and users hit both halves of that:

1. **Cancelling a trusted-device send does not reach the other side.** Cancel only frees the local send slot. The receiver's incoming prompt stays up (until its 60s TTL), an accept that lands afterwards still fetches the full content (the router serves the blob store regardless of the slot, and the store has no in-session GC), and the pairing service's `outgoing` record is never cleared. The gap is even documented in `SendPanel.svelte`: "recalling it needs a broker signal that does not exist."
2. **Receiving by code is unreliable.** The receiver's rendezvous has no timeout, so any unmanned mailbox room means an infinite silent "connecting" state. Rooms end up unmanned constantly: the sender's PAKE exchange is one-shot (a receiver's first failed attempt permanently poisons the code — the retry's handshake frame ends the sender's wait and drops its mailbox), the sender's WebSocket dies ~40s after the app is backgrounded and is never rejoined, and an expired or cancelled send leaves the room with no tombstone. A malformed frame from a stray joiner even fails the whole send.

## What Changes

- **Offer revocation (trusted sends).** A new `revoked` signal flows sender→receiver when a pending offer is cancelled. The receiver dismisses the prompt (in-app and OS notification path), drops the pending offer, and an accept racing the revoke fails gracefully. Cancelling a trusted send also clears the pairing service's outgoing record, so a stale response can no longer emit a spurious `Accepted`, and an immediate re-send to the same device is not auto-declined as busy by a ghost prompt.
- **Bounded receiver rendezvous.** A code receive that cannot complete the ticket exchange within a bound fails with a typed error ("nobody's sharing with that code" copy) instead of hanging forever. The existing 15s "tooSlow" hint stays; the hang goes.
- **Reusable sender rendezvous.** The sender's mailbox session serves sequential redemption attempts for the send's whole lifetime: a failed or mistyped attempt no longer consumes the exchange, a fresh PAKE runs per attempt, and a malformed frame is ignored rather than failing the send.
- **Sender mailbox resilience.** While a quick-share send is live, a dropped broker connection is rejoined (with backoff) instead of silently orphaning the code.
- **Cancelled send stops serving new fetches.** After cancel, a new fetch of the cancelled ticket is refused rather than served from the still-populated store (mechanism decided in design; an already-running fetch may still drain, as today).

No broker (Go) protocol changes: the mailbox stays a dumb relay with its existing buffer-for-the-late-joiner semantics. All fixes are client-side.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `device-pairing`: new requirement — a cancelled, unanswered offer is revoked at the receiver (signal, prompt dismissal, graceful accept-after-revoke, outgoing-state cleanup).
- `code-phrase-share`: new requirements — the receiver's rendezvous is time-bounded with a typed failure; the sender's rendezvous survives failed attempts, garbage frames, and broker reconnects for the send's lifetime.
- `file-transfer`: cancellation requirement extended — cancel of a send prevents new fetches of its ticket and propagates to the pairing layer for a trusted target.

## Impact

- `src-tauri/src/pairing/signal.rs` — new `Signal::Revoked` variant.
- `src-tauri/src/pairing/service.rs` — send revoke on cancel, handle incoming revoke (drop pending + emit), clear `outgoing` on cancel.
- `src-tauri/src/transport/manager.rs` — rendezvous timeouts, sender rendezvous loop (multi-attempt PAKE + rejoin), cancel/serve interaction.
- `src-tauri/src/lib.rs` + `src-tauri/src/events.rs` — `cancel_send` routes through the pairing service; new `PairingRevoked` event; regenerated `src/lib/ipc/bindings.ts`.
- `src/lib/pairing-app.svelte.ts` — clear the incoming prompt on revoke.
- `src/lib/transfer-app.svelte.ts` / `src/lib/errors.ts` — surface the new rendezvous-timeout failure (existing typed-error plumbing).
- Tests: Rust hermetic tests against the shared in-process mock broker (retry-after-typo, timeout, revoke, reconnect). No Go changes, so no broker test changes.
- Related but out of scope: pairing-code redemption has no cancel either (deferred 2026-08-01); this change does not touch the pairing-establishment flow.
