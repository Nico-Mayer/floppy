# transport-iroh

## ADDED Requirements

### Requirement: iroh-based transfer transport

The system SHALL transfer files using iroh + iroh-blobs over QUIC, with hole-punching for direct connections and relay fallback when direct connection fails. croc SHALL NOT be used.

#### Scenario: Direct transfer between two peers

- **WHEN** two peers can reach each other directly
- **THEN** the transfer runs over a direct QUIC connection without routing bulk data through a relay

#### Scenario: Relay fallback

- **WHEN** a direct connection cannot be established
- **THEN** the transfer completes over an iroh relay

### Requirement: Ticket-based addressing

A send SHALL produce an iroh ticket (node addressing plus the content's BLAKE3 hash) that a receiver consumes to fetch the content. The ticket exchange is performed by the rendezvous layer; the transport SHALL accept a ticket and connect.

#### Scenario: Receiver fetches from a ticket

- **WHEN** a receiver is given a valid ticket
- **THEN** it dials the encoded node and fetches the referenced content

### Requirement: Progress reporting without a data race

The transport SHALL report progress from iroh's native progress stream — not by polling internal counters. There SHALL be no deliberate data race in progress reporting.

#### Scenario: Progress events during transfer

- **WHEN** bytes are being transferred
- **THEN** progress events are emitted from the transport's progress stream carrying done/total and current-file position

#### Scenario: Final progress precedes done

- **WHEN** a transfer completes
- **THEN** a final 100% progress event is emitted before the terminal done event, and the done event is emitted last

### Requirement: Content-addressed resume

Re-initiating the same transfer SHALL resume from locally held partial content, keyed by the content's BLAKE3 hash, without a working-directory-based scheme.

#### Scenario: Resume an interrupted receive

- **WHEN** a receive is interrupted and later re-initiated for the same content
- **THEN** already-received data is reused and only the missing data is fetched

#### Scenario: No CWD dependency

- **WHEN** any transfer runs
- **THEN** correctness does not depend on the process working directory, and no per-code working-directory folder is required for resume

### Requirement: Cancellation

Cancelling a transfer SHALL abort it promptly by cancelling its task, returning without waiting for a full network unwind, and SHALL emit no terminal event.

#### Scenario: Cancel a running transfer

- **WHEN** the user cancels an in-flight transfer
- **THEN** the operation stops promptly and no `croc:sent`/`croc:received`/`croc:error` event is emitted for it

### Requirement: Concurrency limits

The system SHALL allow at most one active send and one active receive at a time, rejecting a second of the same kind with a stable, frontend-visible busy error.

#### Scenario: Second send rejected

- **WHEN** a send is already running and another send is requested
- **THEN** the request is rejected with the busy error and the running transfer is unaffected

### Requirement: Configurable relay

The system SHALL default to a built-in relay configuration and SHALL allow overriding the relay (and disabling local discovery) for self-hosting and for deterministic tests.

#### Scenario: Self-hosted relay

- **WHEN** a custom relay is configured
- **THEN** transfers use it instead of the default relay
