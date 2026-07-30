## Why

The transfer event bus has three delivery gaps that show up as stuck or slow transfers. A passive send only completes when the provider event stream counts served bytes up to `total`; but iroh-blobs is content-addressed and resumes by BLAKE3 hash, so when the receiver already holds the blobs, few or zero bytes cross the wire, the byte counter never reaches `total`, and the sender hangs forever with no `Done` while the receiver finishes fine. Incoming trusted-device offers surface slowly (the sender warms its endpoint before the offer is even sent, and a backgrounded receiver gets no OS notification at all). And neither broker WebSocket channel has a heartbeat, so idle sockets die silently and offers land late or as false "device offline".

## What Changes

- Send completion no longer relies solely on byte-counting. The receiver sends an explicit, authenticated completion signal after it finishes exporting; the sender finishes its passive send and emits `Done` on that signal. Byte-count completion stays as a fast path.
- Trusted-device offers surface promptly: offer emission is decoupled from the sender's endpoint warm-up (`wait_for_addr`), so the receiver is notified without waiting on the sender's iroh address being ticket-ready.
- A backgrounded receiver gets an OS notification for an incoming offer (today only transfer *completion* notifies).
- Both broker WebSocket channels (`/ws` mailbox and `/fp` fingerprint routing) gain an application-level ping/pong heartbeat and dead-connection eviction, so idle connections stay live and dead ones are dropped fast.
- The send slot expires on a TTL: a never-accepted or stuck passive send stops serving and frees its pins/slot instead of holding them until manual cancel.
- **BREAKING** (internal invariant): the device runs at most one transfer at a time across both directions — send XOR receive — instead of allowing one send and one receive concurrently. A single atomic transfer session is reserved from the moment a transfer is offered/accepted through its terminal event and unwind.
- An incoming offer that arrives while the device is busy (any active session, or an unresolved offer prompt) is auto-declined with a distinct "busy" reason — no in-app prompt, no OS notification — and the sender is told the other device is busy rather than that it was declined.
- Simultaneous mutual offers (glare) resolve deterministically by fingerprint: the lower fingerprint keeps its offer and busy-declines the incoming one; the higher fingerprint yields, cancels its own offer, and receives. Exactly one transfer results, no deadlock or retry storm.

## Capabilities

### New Capabilities
- `transfer-delivery`: reliable terminal signalling and a single-transfer session model for the transfer core — an explicit receiver→sender completion acknowledgement so deduped/resumed sends still complete and emit `Done`; a single active transfer session (send XOR receive) with atomic reservation and the stable "transfer already running" busy error; and a send-slot time-to-live that expires stuck or never-accepted passive sends.

### Modified Capabilities
- `rendezvous-broker`: add a WebSocket keepalive/heartbeat and dead-connection eviction on both the mailbox (`/ws`) and fingerprint (`/fp`) channels.
- `device-pairing`: an incoming offer is emitted promptly (independent of the sender's endpoint warm-up) and raises an OS notification when unfocused; a busy device auto-declines incoming offers with a distinct busy reason and shows no prompt; simultaneous mutual offers resolve by a fingerprint tiebreaker; the signed response carries a decline reason so a busy auto-decline is distinguishable from a user decline.

## Impact

- Rust core: `src-tauri/src/transport/manager.rs` (send completion, `wait_for_addr` decoupling, send-slot TTL), `src-tauri/src/transport/event.rs` (any new terminal signal), `src-tauri/src/pairing/signal.rs` + `src-tauri/src/pairing/service.rs` (completion signal over `/fp`, prompt offer emission), `src-tauri/src/rendezvous/client.rs` and `src-tauri/src/pairing/broker.rs` (client heartbeat).
- Broker (Go): `broker/mailbox.go`, `broker/fproute.go` (ping/pong + read deadlines).
- Tauri wiring: `src-tauri/src/lib.rs` (OS notification on incoming offer; any new event). Regenerates `src/lib/ipc/bindings.ts`.
- Frontend: `src/lib/pairing-app.svelte.ts` / `src/lib/transfer-app.svelte.ts` only if a new event needs handling.
- Quick-share completion ack keeps the mailbox open one extra frame — a wire-protocol tweak the broker relays opaquely (no broker change for that half).
