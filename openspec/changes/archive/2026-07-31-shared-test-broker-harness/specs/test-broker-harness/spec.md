## ADDED Requirements

### Requirement: Single shared mock broker for Rust tests

The Rust test suite SHALL exercise the broker client, PAKE, transport, and
pairing code against one shared, faithful in-process mock of the Go broker,
rather than per-module reimplementations. The mock SHALL live in a single
`#[cfg(test)]` test-support module and SHALL serve both broker modes the real
broker serves: the `/ws` code-mailbox and the `/fp` fingerprint router. No other
mock of the broker wire protocol may exist in the crate.

#### Scenario: One mailbox implementation, matching the broker

- **WHEN** any test needs the `/ws` code-mailbox (quick share or code pairing)
- **THEN** it uses the shared mock, whose mailbox caps a room at two parties,
  replies `{"type":"full"}` to a third join, and buffers a party's frames until
  the peer joins — the same behavior `broker/mailbox.go` and the `full`-aware
  client (`rendezvous/client.rs`) expect

#### Scenario: One fingerprint router

- **WHEN** a pairing test needs the `/fp` router
- **THEN** it uses the shared mock, which registers a party by the fingerprint
  derived from its encoded key and relays signal blobs to the target
  fingerprint, matching `broker/fproute.go`

#### Scenario: No duplicated broker mocks remain

- **WHEN** the change is complete
- **THEN** `transport/manager.rs` and `pairing/service.rs` contain no
  `spawn_mock_broker` / `spawn_mock_mailbox_broker` / `spawn_mock_fp_broker`
  definitions, and both test modules build their `Manager`, write test files,
  and walk output directories through the shared helpers

### Requirement: Refactor preserves the green test gate

Moving the helpers SHALL NOT delete or weaken any existing test. `cargo test` in
`src-tauri/` SHALL pass with the same set of tests running as before the change.

#### Scenario: All tests still run and pass

- **WHEN** `cargo test` runs in `src-tauri/` after the change
- **THEN** every test that existed before the change still exists and passes,
  now driven by the shared mock and helpers
