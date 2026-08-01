# file-transfer

## Purpose

Move files device to device over iroh: a passive, content-addressed send that any holder of
its ticket can fetch, an owned receive task that reports real progress and resumes by hash,
one transfer at a time per device, and a lifecycle that only ever claims delivery when the
other side says it got the files.

## Requirements

### Requirement: iroh-based transfer transport

The system SHALL transfer files using iroh + iroh-blobs over QUIC, with hole-punching for
direct connections and relay fallback when a direct connection cannot be established.

#### Scenario: Direct transfer between two peers

- **WHEN** two peers can reach each other directly
- **THEN** the transfer runs over a direct QUIC connection without routing bulk data through a
  relay

#### Scenario: Relay fallback

- **WHEN** a direct connection cannot be established
- **THEN** the transfer completes over an iroh relay

### Requirement: Ticket-based addressing

A send SHALL produce an iroh ticket (node addressing plus the content's BLAKE3 hash) that a
receiver consumes to fetch the content. The ticket exchange is performed by the rendezvous
layer; the transport SHALL accept a ticket and connect.

#### Scenario: Receiver fetches from a ticket

- **WHEN** a receiver is given a valid ticket
- **THEN** it dials the encoded node and fetches the referenced content

### Requirement: Send is passive, receive is an owned task

A send SHALL import its files into the content-addressed blob store as a collection, hand
out a ticket, and serve fetches from a router. It SHALL NOT drive the transfer itself, and
SHALL NOT block waiting for a receiver to appear.

A receive SHALL be an owned task that connects, learns the verified total size, fetches, and
exports the files to their destination. The receiving device therefore owns the transfer's
lifetime, and the sending device owns only the content it is serving.

#### Scenario: A send waits without an active peer

- **WHEN** a send is started and no receiver has connected
- **THEN** the content is imported and served, and the send is waiting rather than running or
  failed

#### Scenario: The receiver drives the fetch

- **WHEN** a receiver consumes a ticket
- **THEN** it dials, obtains the verified total size, fetches, and exports, without the sender
  initiating anything

### Requirement: Progress reporting without a data race

The transport SHALL report progress from iroh's own progress streams — the provider event
stream on the sending side and the native fetch progress stream on the receiving side —
not by polling internal counters. There SHALL be no deliberate data race in progress
reporting.

#### Scenario: Progress events during transfer

- **WHEN** bytes are being transferred
- **THEN** progress events are emitted from the transport's progress stream carrying
  done/total and the current file's position

#### Scenario: Final progress precedes done

- **WHEN** a transfer completes
- **THEN** a final 100% progress event is emitted before the terminal done event, and the done
  event is emitted last

### Requirement: Content-addressed resume

Re-initiating the same transfer SHALL resume from locally held partial content, keyed by the
content's BLAKE3 hash. Correctness SHALL NOT depend on the process working directory, and
no per-code working-directory folder SHALL be required.

#### Scenario: Resume an interrupted receive

- **WHEN** a receive is interrupted and later re-initiated for the same content
- **THEN** already-received data is reused and only the missing data is fetched

#### Scenario: No CWD dependency

- **WHEN** any transfer runs
- **THEN** correctness does not depend on the process working directory, and no per-code
  working-directory folder is required for resume

### Requirement: Cancellation

Cancelling a transfer SHALL abort it promptly by cancelling its task, returning without
waiting for a full network unwind, and SHALL emit no terminal event.

#### Scenario: Cancel a running transfer

- **WHEN** the user cancels an in-flight transfer
- **THEN** the operation stops promptly, the connection is reset rather than drained, and no
  done or error event is emitted for it

### Requirement: Single active transfer session

The device SHALL run at most one transfer at a time across both directions: while a send is
active the device SHALL NOT begin a receive, and while a receive is active the device SHALL
NOT begin a send. A transfer is "active" from the moment its session is reserved — an
outgoing offer sent, a quick-share code shown and serving, or an incoming offer accepted —
through its terminal event, any cancel, and the unwind that follows, until the session
returns to idle.

Reserving the session SHALL be atomic, so two concurrent starts cannot both succeed. A start
that cannot reserve the session SHALL fail with the stable "transfer already running" busy
error and SHALL leave the active transfer untouched. A session that was cancelled but has
not finished unwinding SHALL still count as busy until it releases.

#### Scenario: Sending blocks a new receive

- **WHEN** a send is active and the user tries to start a receive (a code receive or accepting
  an offer)
- **THEN** the start fails with the "transfer already running" busy error and the send continues
  undisturbed

#### Scenario: Receiving blocks a new send

- **WHEN** a receive is active and the user tries to start a send
- **THEN** the start fails with the "transfer already running" busy error and the receive
  continues undisturbed

#### Scenario: Session frees on completion

- **WHEN** the active transfer reaches its terminal event and finishes unwinding
- **THEN** the session returns to idle and a subsequent send or receive may be started

#### Scenario: Unwinding still counts as busy

- **WHEN** a transfer has been cancelled but has not finished releasing and a new transfer is
  started
- **THEN** the new start is refused until the previous session releases (or times out unwinding)

#### Scenario: Waiting for accept counts as busy

- **WHEN** an outgoing offer has been sent and is still waiting for the other device to accept
- **THEN** the device is busy and cannot begin a receive until that offer resolves or expires

### Requirement: Passive send completes on receiver acknowledgement

A passive send SHALL reach its terminal done state when the receiver reports that it has
fully received and exported the content, independent of how many payload bytes were served
over the wire. Because the blob store is content-addressed and resumes by BLAKE3 hash, a
receiver that already holds some or all of the content transfers fewer bytes than the send's
total (possibly zero), so byte-count completion alone SHALL NOT be the only path to done.
Byte-count completion MAY remain as a fast path when it fires first.

The completion signal SHALL be authenticated end to end: verified against the trust store
for a trusted-device transfer, and cryptographically bound to the shared secret for a code
transfer, so a third party cannot forge a completion. Exactly one terminal event SHALL be
emitted per send: a completion signal arriving after the send has already finished (by byte
count or cancel) SHALL be ignored.

#### Scenario: Deduped receive still completes the send

- **WHEN** a receiver already holds every blob of the offered content and its fetch moves zero
  payload bytes
- **THEN** the receiver signals completion and the sender emits done for the send and frees the
  send slot

#### Scenario: Resumed receive still completes the send

- **WHEN** a receiver already holds part of the content and its fetch moves fewer bytes than the
  send total
- **THEN** the sender emits done on the receiver's completion signal, not on the byte count
  reaching total

#### Scenario: Normal transfer completes once

- **WHEN** a receiver fetches all bytes fresh and both the byte counter reaches total and a
  completion signal arrives
- **THEN** the sender emits exactly one done event and ignores the later of the two triggers

#### Scenario: Forged completion is ignored

- **WHEN** a completion signal arrives that is not authenticated for the pending send
  (untrusted signer, bad signature, or wrong key)
- **THEN** the send does not complete and no done event is emitted for it

### Requirement: Send slot expires when stuck or unaccepted

A passive send SHALL stop serving and release its slot and its content pins after a bounded
time-to-live during which no transfer has completed, so a never-accepted offer or a peer
that vanished mid-fetch does not hold the single send slot and its pinned blobs
indefinitely. Expiry SHALL be treated as the send ending, not as a delivered transfer: it
SHALL free the slot so a new send may start, and it SHALL NOT emit a done event that would
tell the user the files were delivered. A send that is actively transferring (making
progress) SHALL NOT be expired.

#### Scenario: Never-accepted send expires

- **WHEN** a send has been serving past its time-to-live and no receiver has fetched or
  completed it
- **THEN** the send stops serving, releases its slot and pins, and a subsequent send may claim
  the slot

#### Scenario: Active send is not expired

- **WHEN** a receiver is actively fetching and progress is still advancing at the time-to-live
  boundary
- **THEN** the send is not expired and continues to completion

#### Scenario: Expiry does not claim delivery

- **WHEN** a send expires without any receiver completing it
- **THEN** no done event is emitted for that send

### Requirement: Configurable relay

The system SHALL default to a built-in relay configuration and SHALL allow overriding the
relay (and disabling local discovery) for self-hosting and for deterministic tests.

#### Scenario: Self-hosted relay

- **WHEN** a custom relay is configured
- **THEN** transfers use it instead of the default relay

#### Scenario: Tests run without a network

- **WHEN** the transport test suite runs
- **THEN** it binds loopback with relaying disabled and an in-memory store, so no test depends
  on a network or an external relay
