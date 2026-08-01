## 1. Create the shared test-support module

- [x] 1.1 Add `src-tauri/src/testsupport.rs` and gate it in `lib.rs` with `#[cfg(test)] mod testsupport;`.
- [x] 1.2 Move the **faithful** mailbox mock (2-party cap + `{"type":"full"}`, backlog buffering — the `pairing/service.rs` version) into `testsupport` as `mock_mailbox_broker() -> String` (URL ends `/ws`).
- [x] 1.3 Move `spawn_mock_fp_broker` into `testsupport` as `mock_fp_broker() -> String` (URL ends `/fp`), sharing the accept/relay plumbing with the mailbox mock where practical.
- [x] 1.4 Add `test_manager(dir, name, broker_url, emit)` collapsing `manager()` + `quick_manager()`; add shared `write_file(dir, name, bytes)` and `walk(dir)`.

## 2. Point `transport/manager.rs` tests at the shared module

- [x] 2.1 Delete `spawn_mock_broker`, `manager()`, `quick_manager()`, `write_file()`, `walk()` from the tests module.
- [x] 2.2 Replace uses with `crate::testsupport::{mock_mailbox_broker, test_manager, write_file, walk}`; keep `Collector`/`ticket_of`/`wait_for` local.
- [x] 2.3 Fix any test that breaks under the faithful mailbox cap (none broke).

## 3. Point `pairing/service.rs` tests at the shared module

- [x] 3.1 Delete `spawn_mock_fp_broker`, `spawn_mock_mailbox_broker`, `manager()`, `write_file()`, `walk()` from the tests module.
- [x] 3.2 Replace uses with `crate::testsupport::{mock_fp_broker, mock_mailbox_broker, test_manager, write_file, walk}`; keep `PairCollector`/`DoneFlag`/`SendDone`/`Terminals` local.

## 4. Verify

- [x] 4.1 `cargo test` in `src-tauri/` passes (70 passed, 2 ignored) with the same tests running as before.
- [x] 4.2 `cargo clippy --tests` clean; no dead-code or unused-import warnings from the move.
- [x] 4.3 Grep confirms no `spawn_mock_` definitions remain outside `testsupport`.
