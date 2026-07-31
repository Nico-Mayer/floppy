## Context

Three in-process broker mocks and a set of filesystem/manager helpers are
duplicated across two test modules:

- `transport/manager.rs` tests: `spawn_mock_broker` (`/ws` mailbox — relays by
  party id, buffers backlog, **does not** cap the room or emit `full`),
  `manager()`, `write_file()`, `walk()`, plus `quick_manager()`.
- `pairing/service.rs` tests: `spawn_mock_mailbox_broker` (`/ws` mailbox — caps
  at two parties, emits `{"type":"full"}`, buffers backlog),
  `spawn_mock_fp_broker` (`/fp` router), `manager()`, `write_file()`, `walk()`.

The two mailbox mocks have already diverged: only the pairing copy matches the
deployed broker (`broker/mailbox.go`) and the `full`-aware client
(`rendezvous/client.rs`, which returns "that code is already in use" on a `full`
frame). Both `manager()` builders are identical except for the trait alias
(`Emitter` vs `TEmitter`, which are the same trait). Tests here live inside the
crate because they exercise private items (`receive_dest`, `now_stamp`, provider
internals, `PairingService` internals), so they cannot move to `tests/`.

## Goals / Non-Goals

**Goals:**

- One faithful mock broker serving both `/ws` and `/fp`, used everywhere.
- Shared `write_file`, `walk`, and a single broker-URL-parameterized
  `test_manager` builder.
- Zero production-code change; identical test coverage, still green.

**Non-Goals:**

- No new tests, no changed assertions (beyond fixes forced by the faithful mock).
- No change to event collectors (`Collector`, `PairCollector`, `DoneFlag`,
  `SendDone`) — these are assertion-shaped per suite and stay local.
- No touching the real broker, client, or any wire format.

## Decisions

**1. A crate-level `#[cfg(test)] mod testsupport`.** Add
`src-tauri/src/testsupport.rs`, gated in `lib.rs` with
`#[cfg(test)] mod testsupport;`. Both test modules reach it via
`crate::testsupport::…`. This is the only in-crate way to share helpers that
must sit alongside private-item unit tests; an integration `tests/` crate cannot
see the private items these suites test.

**2. One mock broker, both modes, one listener.** Expose
`spawn_mock_broker() -> String` returning a base `ws://127.0.0.1:<port>` and let
callers append `/ws` or `/fp`, OR expose two thin spawns
(`mock_mailbox_broker() -> String` ending `/ws`, `mock_fp_broker() -> String`
ending `/fp`) backed by shared connection-handling code. Prefer the two-spawn
surface — it matches how the real URLs are derived (`/ws` → `/fp`) and keeps call
sites readable. The mailbox implementation is the **faithful** one (2-party cap +
`full`, backlog buffering); the looser manager-side copy is dropped.

**3. One `test_manager(dir, name, broker_url, emit)` builder.** Collapses
`manager()` (dummy broker URL) and `quick_manager()` (real mock URL) into a
single fn; the fixed dummy `ws://127.0.0.1:1/ws` stays the default at call sites
that do not need a broker. `Emitter`/`TEmitter` are one trait, so a single
`Arc<dyn Emitter>` parameter serves both suites.

**4. Faithful mock forces a fix, not a workaround.** `manager.rs`'s quick-share
tests now hit the 2-party cap. If any test opened a third mailbox connection to
the same room, it will now get `full`; the fix is to correct the test, not to
re-loosen the mock. Expected to be a no-op — quick share is strictly two-party.

## Risks / Trade-offs

- **A hidden test relied on the loose mock.** Surfaces immediately as a `cargo
  test` failure; fix the test. Low likelihood (quick share is two-party by
  construction).
- **Slightly more indirection** (`crate::testsupport::…` vs a local fn). Worth it:
  one mock to keep in step with `broker/`, not three.
- **`testsupport` compiled only under `#[cfg(test)]`**, so it never reaches a
  release binary; the trade-off is nil for shipped code.
