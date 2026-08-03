# harden-transfer-lifecycle — tasks

## 1. Spike: provider request gating (R1)

- [x] 1.1 Verify iroh-blobs 0.103 supports allow/deny per get request via the `RequestMode::Rpc` family while keeping the per-request update stream the provider pump consumes; write a throwaway hermetic test proving a denied request fails the fetch. If the API cannot do this cleanly, record the fallback (documented limitation per design D7) in design.md and skip group 5.

## 2. Offer revocation (trusted sends)

- [x] 2.1 Add a signed `Revocation` to `pairing/offer.rs` (sign/verify mirroring `Completion`) and a `Signal::Revoked` variant in `pairing/signal.rs`, with unit tests for sign/verify and forged-revocation rejection
- [x] 2.2 Add `PairingService::cancel_outgoing()`: if `outgoing` matches, send `Signal::Revoked`, clear `outgoing`; route the `cancel_send` command through it before `Manager::cancel(Kind::Send)` in `lib.rs`
- [x] 2.3 Handle `Signal::Revoked` in `incoming_loop`: verify, remove from `pending`, emit `PairingEvent::Revoked { transfer_id }` only when something was removed
- [x] 2.4 Add the `PairingRevoked` IPC event in `events.rs` + `specta_builder()`, regenerate bindings (`cargo test export_bindings`)
- [x] 2.5 Frontend: on `pairingRevoked`, clear the matching incoming prompt and toast ("They stopped the send." voice-checked); soften the accept-after-revoke error copy
- [x] 2.6 Hermetic service tests over the mock `/fp` broker: revoke dismisses pending; stale response after cancel emits nothing; re-offer after cancel surfaces instead of busy-decline; revoke after accept is a no-op

## 3. Receiver rendezvous timeout

- [x] 3.1 Wrap `rendezvous_receive` in a 30s `tokio::time::timeout`; on expiry free the recv slot and emit `Event::Failed` with `TransferErrorCode::Timeout` and app-voice copy (check the code, make sure the other device still shows it)
- [x] 3.2 Hermetic test: receive against an empty mailbox room fails with the timeout error (shrink the bound for the test); wrong-words attempt still fails with the wrong-code error, not the timeout

## 4. Sender rendezvous session loop

- [x] 4.1 Restructure `rendezvous_send` into the D5 loop: per-frame try-open under a key ring → completion; else fresh PAKE attempt (seal + send ticket, push key); malformed frames ignored; loop races the send's `done` token
- [x] 4.2 Add reconnect-with-backoff (first join still fails the share; later drops rejoin ~1s→15s capped, stop on `done`)
- [x] 4.3 Hermetic tests over the mock `/ws` broker: retry-after-typo succeeds; garbled frame does not fail the send; completion under an earlier attempt's key finishes the send; rejoin after a dropped sender connection lets a later receiver complete; no rejoin after cancel/expiry

## 5. Serve gating on cancel (skip if 1.1 chose the fallback)

- [x] 5.1 Switch the provider `EventMask` to the gating mode and answer each request from the slot table (live non-cancelled send → allow, else deny), keeping the progress pump behaviour identical
- [x] 5.2 Hermetic test: fetch of a cancelled send's ticket is refused; an active send's probe and bulk fetch still work; progress/done events unchanged on the happy path

## 6. Verification

- [x] 6.1 `cargo test` green in `src-tauri/`; `npm run check` green; regenerate + commit bindings if drifted
- [x] 6.2 Live sanity via `mise run test:live` (hosted broker) and a manual two-device pass: cancel-while-prompt-showing dismisses on the receiver; typo-then-retry receive works; backgrounded-sender resume works
