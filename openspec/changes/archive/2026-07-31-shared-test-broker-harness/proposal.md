## Why

The Rust test suite hand-rolls the Go broker's wire protocol three times, in two
files, and the copies have already drifted: `transport/manager.rs` defines
`spawn_mock_broker` (a `/ws` mailbox that never caps a room or emits `full`),
while `pairing/service.rs` defines `spawn_mock_mailbox_broker` (a `/ws` mailbox
that *does* cap at two parties and emits `full`, matching the real broker and the
client's `full` handling) plus `spawn_mock_fp_broker` (`/fp` routing). The
`manager()`, `write_file()`, and `walk()` helpers are copy-pasted between the two
test modules too. Three mocks of one protocol is three chances to drift from each
other and from `broker/`, and the drift is already real — a test could pass
against a mock that no longer behaves like the broker it stands in for.

## What Changes

- Add one `#[cfg(test)]`-only test-support module in the crate holding a single
  faithful mock broker that serves both broker modes (`/ws` code-mailbox and
  `/fp` fingerprint routing), plus the shared `write_file` and `walk` filesystem
  helpers and a single `test_manager` builder parameterized by broker URL.
- Delete `spawn_mock_broker`, `spawn_mock_mailbox_broker`, `spawn_mock_fp_broker`,
  and the duplicated `manager()`/`write_file()`/`walk()` from
  `transport/manager.rs` and `pairing/service.rs`; both test modules consume the
  shared module instead.
- Keep the faithful mailbox behavior (2-party cap + `full`, backlog buffering)
  as the single implementation, so `manager.rs`'s quick-share tests now run
  against a mock that matches the broker and the `full`-aware client.
- No production code changes. No public API, command, event, or wire change.

## Capabilities

### New Capabilities
<!-- none: this is a test-infrastructure refactor with no spec-level behavior change -->

### Modified Capabilities
<!-- none: no requirement or capability behavior changes -->

## Impact

- Test code only: `src-tauri/src/transport/manager.rs` (tests module),
  `src-tauri/src/pairing/service.rs` (tests module), and a new
  `#[cfg(test)]` module (e.g. `src-tauri/src/testsupport.rs` gated in `lib.rs`).
- No change to shipped binaries; `#[cfg(test)]` code is compiled out of release
  builds.
- Gate: `cargo test` in `src-tauri/` stays green with no test deletions — every
  existing test keeps running, only its helpers move.
- Risk is contained to tests. The one behavior shift is that `manager.rs`'s
  quick-share tests gain the `full`/2-party cap they lacked; if any relied on the
  looser mock, that surfaces as a test failure to fix during the change.
