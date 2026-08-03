# code-phrase-share — delta

## ADDED Requirements

### Requirement: Receiving by code always terminates

A code receive SHALL bound its rendezvous (joining the mailbox, the PAKE exchange, and
receiving the sealed ticket) with a timeout. If the exchange does not complete within the
bound, the receive SHALL fail with the typed timeout error and copy that tells the user to
check the code and that the other device is still showing it. A code receive SHALL end in
exactly one of: a completed transfer, a typed failure, or a user cancel — never an
indefinite silent wait.

#### Scenario: Nobody is sharing on that code

- **WHEN** the user enters a code whose mailbox room has no sender (the code expired, the
  sender cancelled, or the sender's connection died and has not rejoined)
- **THEN** the receive fails with the typed timeout error within the rendezvous bound,
  instead of waiting forever in the connecting state

#### Scenario: Wrong words still fail fast

- **WHEN** the user enters a code whose digits match a live room but whose words are wrong
- **THEN** the exchange fails the PAKE/AEAD check as before, well inside the bound — the
  timeout does not replace or delay the wrong-code failure

### Requirement: A live code survives failed redemption attempts

The sender's rendezvous session SHALL serve redemption attempts for as long as the send is
live, not once. Each new attempt SHALL get a fresh PAKE exchange with the ticket sealed
under that attempt's derived key. A frame that neither opens under a known session key nor
completes a PAKE exchange SHALL be ignored, not treated as a failure of the send. A sealed
completion under any of the send's session keys SHALL finish the send.

#### Scenario: Retry after a typo succeeds

- **WHEN** a receiver's first attempt fails (wrong words, matching digits) and the receiver
  retries with the correct code while the send is still live
- **THEN** the sender runs a fresh exchange for the retry and the transfer proceeds — the
  failed attempt does not consume or orphan the code

#### Scenario: A garbled frame does not kill the send

- **WHEN** a frame arrives on the sender's mailbox that is neither a valid PAKE message nor
  a sealed completion
- **THEN** the sender ignores it and keeps serving the code; the send does not fail

#### Scenario: Completion sealed under an earlier attempt still lands

- **WHEN** a receiver completes its fetch and sends its sealed "done" after a later
  redemption attempt has derived a newer session key
- **THEN** the sender recognises the completion under the earlier key and finishes the send

### Requirement: The sender's mailbox session is resilient for the send's lifetime

After a first successful join, the sender SHALL rejoin the mailbox room with bounded backoff
whenever its broker connection drops, for as long as the send is live. A first join that
fails SHALL still fail the quick share (the code was never deliverable). Rejoining SHALL
stop once the send ends by any path (completion, cancel, expiry).

#### Scenario: Backgrounded sender recovers on resume

- **WHEN** the sender's app is suspended long enough for the broker to evict its connection,
  then resumes while the send is still live
- **THEN** the sender rejoins the room, and a receiver entering the code after the rejoin
  completes the exchange normally

#### Scenario: No connection at share time still fails fast

- **WHEN** the broker cannot be reached when the quick share starts
- **THEN** the share fails with the typed connect error as it does today — resilience begins
  only after the code was successfully offered

#### Scenario: Rejoin attempts end with the send

- **WHEN** the send completes, is cancelled, or expires while the sender is between rejoin
  attempts
- **THEN** no further rejoin is attempted and the mailbox session is not re-established
