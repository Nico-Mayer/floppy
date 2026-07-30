## ADDED Requirements

### Requirement: Signed transfer completion signal

After a receiver finishes receiving and exporting the content of an accepted offer, it SHALL send the sender a signed completion signal carrying the receiver's public identity and the transfer id. The sender SHALL verify the signal is from a trusted device with an intact signature and matches a pending send before finishing that send, so a third party cannot forge a completion for a transfer that did not happen. The completion signal SHALL be distinct from the accept/decline response and SHALL be sent only on successful export, not on cancel or failure.

#### Scenario: Valid completion finishes the send

- **WHEN** the sender verifies a signed completion signal from the trusted receiver of a pending send
- **THEN** verification succeeds and the sender finishes that send

#### Scenario: Forged or untrusted completion rejected

- **WHEN** a completion signal is verified whose signer is untrusted or whose signature is invalid
- **THEN** verification fails and the sender does not finish the send on that signal

#### Scenario: No completion on a failed receive

- **WHEN** a receive is cancelled or fails before export finishes
- **THEN** no completion signal is sent to the sender

### Requirement: Prompt incoming-offer surfacing

An incoming, verified offer SHALL be surfaced to the receiving user as soon as it is verified, without waiting on the sender's endpoint warm-up. The receiver does not dial the sender until the user accepts, so offer surfacing SHALL NOT be gated on the sender's iroh address being ready to embed in a ticket. When the app is not focused, an incoming verified offer SHALL raise an operating-system notification in addition to the in-app prompt, so the user learns of the offer without the app in the foreground.

#### Scenario: Offer is not delayed by sender endpoint warm-up

- **WHEN** a sender offers files while its endpoint has not yet discovered a ticket-ready address
- **THEN** the receiver still surfaces the verified offer promptly, and the ticket is only needed once the user accepts

#### Scenario: Backgrounded receiver is notified

- **WHEN** a verified offer arrives while the app window is not focused
- **THEN** an OS notification is raised for the incoming offer

#### Scenario: Focused receiver uses the in-app prompt

- **WHEN** a verified offer arrives while the app window is focused
- **THEN** the in-app accept/decline prompt is shown without a redundant OS notification

### Requirement: Busy devices auto-decline incoming offers

When the device already has an active transfer session or an unresolved incoming-offer prompt, a newly verified offer SHALL be automatically declined with a distinct "busy" reason, and SHALL NOT raise an in-app prompt or an OS notification. At most one incoming-offer prompt SHALL be pending at a time. The sender SHALL be able to tell a busy auto-decline from a user decline and SHALL surface it as the other device being busy (try again later), not as a refusal. A pending offer prompt SHALL expire after a bounded time and free the reservation, so a device is never left wedged as busy by an offer the user never answered.

#### Scenario: Offer during an active transfer is auto-declined

- **WHEN** a verified offer arrives while a send or receive is active
- **THEN** it is declined with the busy reason, and no prompt or OS notification is raised

#### Scenario: Second offer while a prompt is pending is auto-declined

- **WHEN** a verified offer arrives while an earlier offer prompt is still unanswered
- **THEN** the new offer is declined with the busy reason and only the first prompt remains

#### Scenario: Sender distinguishes busy from a user decline

- **WHEN** the sender receives a busy auto-decline versus a user decline
- **THEN** the busy case is surfaced as the other device being busy, and the user-decline case as a refusal

#### Scenario: Unanswered prompt frees the device

- **WHEN** an offer prompt is left unanswered past its timeout
- **THEN** the reservation is released and the device is no longer busy for later offers

### Requirement: Simultaneous mutual offers resolved by fingerprint

When two devices offer to each other at the same time — each receives an offer from the very device it is currently offering to — the tie SHALL be resolved deterministically by device fingerprint. The device with the lower fingerprint SHALL keep its outgoing offer and busy-decline the incoming one; the device with the higher fingerprint SHALL yield, cancelling its own outgoing offer and surfacing the incoming offer for accept/decline. The rule SHALL be symmetric so exactly one direction survives, with no deadlock and no retry loop. A concurrent offer from a device other than the current offer target SHALL be treated as an ordinary busy auto-decline, not a glare.

#### Scenario: Lower fingerprint proceeds as sender

- **WHEN** device A (lower fingerprint) and device B (higher fingerprint) offer to each other at once
- **THEN** A keeps its offer and busy-declines B's, and B yields and surfaces A's offer

#### Scenario: Exactly one transfer results

- **WHEN** the glare is resolved
- **THEN** one device is sending and the other receiving, and neither is left deadlocked or told to retry

#### Scenario: Concurrent offer from a non-target device is a plain busy-decline

- **WHEN** the device is offering to one peer and receives an offer from a different peer
- **THEN** that offer is busy-declined normally, without applying the glare tiebreaker

## MODIFIED Requirements

### Requirement: Signed accept/decline responses

A receiver's response to an offer SHALL be signed and carry the receiver's public identity, the transfer id, and the accept/decline decision. A decline SHALL additionally carry a reason distinguishing a user decline from an automatic busy decline (the device already had an active transfer or an unresolved offer prompt). The sender SHALL verify the response is from a trusted device with an intact signature before acting on an acceptance, so a third party cannot spoof an acceptance to make a device start sending. The sender SHALL surface a busy decline as the other device being busy (try again later), distinct from a user refusal.

#### Scenario: Valid acceptance verifies

- **WHEN** a signed acceptance from a trusted device is verified
- **THEN** verification succeeds and the accept flag is trusted

#### Scenario: Forged or untrusted response rejected

- **WHEN** a response is verified whose signer is untrusted or whose signature is invalid
- **THEN** verification fails and the sender does not start sending

#### Scenario: Busy decline is distinguishable from a user decline

- **WHEN** a signed decline carrying the busy reason is verified
- **THEN** the sender surfaces the other device as busy (try again later), not as a refusal
