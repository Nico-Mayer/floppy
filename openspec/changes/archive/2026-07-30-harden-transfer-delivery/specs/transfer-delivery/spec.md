## ADDED Requirements

### Requirement: Single active transfer session

The device SHALL run at most one transfer at a time across both directions: while a send is active the device SHALL NOT begin a receive, and while a receive is active the device SHALL NOT begin a send. A transfer is "active" from the moment its session is reserved — an outgoing offer sent, a quick-share code shown and serving, or an incoming offer accepted — through its terminal event (`Done`/`Failed`), any cancel, and the unwind that follows, until the session returns to idle. Reserving the session SHALL be atomic, so two concurrent starts cannot both succeed. A start that cannot reserve the session SHALL fail with the stable "transfer already running" busy error and SHALL leave the active transfer untouched. A session that was cancelled but has not finished unwinding SHALL still count as busy until it releases.

#### Scenario: Sending blocks a new receive

- **WHEN** a send is active and the user tries to start a receive (a code receive or accepting an offer)
- **THEN** the start fails with the "transfer already running" busy error and the send continues undisturbed

#### Scenario: Receiving blocks a new send

- **WHEN** a receive is active and the user tries to start a send
- **THEN** the start fails with the "transfer already running" busy error and the receive continues undisturbed

#### Scenario: Session frees on completion

- **WHEN** the active transfer reaches its terminal event and finishes unwinding
- **THEN** the session returns to idle and a subsequent send or receive may be started

#### Scenario: Unwinding still counts as busy

- **WHEN** a transfer has been cancelled but has not finished releasing and a new transfer is started
- **THEN** the new start is refused until the previous session releases (or times out unwinding)

#### Scenario: Waiting for accept counts as busy

- **WHEN** an outgoing offer has been sent and is still waiting for the other device to accept
- **THEN** the device is busy and cannot begin a receive until that offer resolves or expires

### Requirement: Passive send completes on receiver acknowledgement

A passive send SHALL reach its terminal `Done` state when the receiver reports that it has fully received and exported the content, independent of how many payload bytes were served over the wire. Because the blob store is content-addressed and resumes by BLAKE3 hash, a receiver that already holds some or all of the content transfers fewer bytes than the send's total (possibly zero), so byte-count completion alone SHALL NOT be the only path to `Done`. Byte-count completion MAY remain as a fast path when it fires first. The completion signal SHALL be authenticated end-to-end for a trusted-device transfer (verified against the trust store) and cryptographically bound to the shared secret for a code transfer, so a third party cannot forge a completion. Exactly one terminal event SHALL be emitted per send: a completion signal arriving after the send has already finished (by byte count or cancel) SHALL be ignored.

#### Scenario: Deduped receive still completes the send

- **WHEN** a receiver already holds every blob of the offered content and its fetch moves zero payload bytes
- **THEN** the receiver signals completion and the sender emits `Done` for the send and frees the send slot

#### Scenario: Resumed receive still completes the send

- **WHEN** a receiver already holds part of the content and its fetch moves fewer bytes than the send total
- **THEN** the sender emits `Done` on the receiver's completion signal, not on the byte count reaching total

#### Scenario: Normal transfer completes once

- **WHEN** a receiver fetches all bytes fresh and both the byte counter reaches total and a completion signal arrives
- **THEN** the sender emits exactly one `Done` and ignores the later of the two triggers

#### Scenario: Forged completion is ignored

- **WHEN** a completion signal arrives that is not authenticated for the pending send (untrusted signer, bad signature, or wrong key)
- **THEN** the send does not complete and no `Done` is emitted for it

### Requirement: Send slot expires when stuck or unaccepted

A passive send SHALL stop serving and release its slot and its content pins after a bounded time-to-live during which no transfer has completed, so a never-accepted offer or a peer that vanished mid-fetch does not hold the single send slot and its pinned blobs indefinitely. Expiry SHALL be treated as the send ending, not as a delivered transfer: it SHALL free the slot so a new send may start, and it SHALL NOT emit a `Done` that would tell the user the files were delivered. A send that is actively transferring (making progress) SHALL NOT be expired.

#### Scenario: Never-accepted send expires

- **WHEN** a send has been serving past its time-to-live and no receiver has fetched or completed it
- **THEN** the send stops serving, releases its slot and pins, and a subsequent send may claim the slot

#### Scenario: Active send is not expired

- **WHEN** a receiver is actively fetching and progress is still advancing at the time-to-live boundary
- **THEN** the send is not expired and continues to completion

#### Scenario: Expiry does not claim delivery

- **WHEN** a send expires without any receiver completing it
- **THEN** no `Done` is emitted for that send
