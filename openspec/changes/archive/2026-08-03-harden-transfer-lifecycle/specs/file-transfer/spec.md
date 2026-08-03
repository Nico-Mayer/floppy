# file-transfer — delta

## MODIFIED Requirements

### Requirement: Cancellation

Cancelling a transfer SHALL abort it promptly by cancelling its task, returning without
waiting for a full network unwind, and SHALL emit no terminal event.

Cancelling a send SHALL also end its availability: new fetch requests for the cancelled
send's content SHALL be refused, even though the content may still sit in the blob store
until relaunch. A fetch already streaming when the cancel lands MAY finish on the
receiver's end. Cancelling a send whose target was a trusted device SHALL propagate to the
pairing layer so the outstanding offer is revoked (see device-pairing).

#### Scenario: Cancel a running transfer

- **WHEN** the user cancels an in-flight transfer
- **THEN** the operation stops promptly, the connection is reset rather than drained, and no
  done or error event is emitted for it

#### Scenario: A cancelled ticket is no longer fetchable

- **WHEN** a send is cancelled and a peer that holds its ticket attempts a new fetch
  afterwards
- **THEN** the request is refused rather than served from the still-populated store

#### Scenario: Cancelling a trusted send revokes its offer

- **WHEN** the user cancels a send whose signed offer is still awaiting the other device's
  answer
- **THEN** the pairing layer sends a revocation for that transfer alongside freeing the send
  slot
