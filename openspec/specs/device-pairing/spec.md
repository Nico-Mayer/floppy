# device-pairing

## Purpose

Give each install a long-lived cryptographic identity and a local trust store of paired devices, so trusted peers can transfer files with no human-entered code: transfer codes and a short authentication string are derived deterministically from an ECDH shared secret, and offers/responses exchanged between devices are signed and verified against the trust store.

## Requirements

### Requirement: Per-device identity keypair

Each install SHALL own a long-lived cryptographic identity consisting of an Ed25519 signing keypair (identity + signatures) and an X25519 keypair (ECDH). The identity SHALL be generated on first run and persisted so it is stable across restarts. The private material SHALL be stored with owner-only file permissions. The storage directory SHALL be injectable so multiple instances can run side by side with distinct identities.

#### Scenario: Identity generated on first run

- **WHEN** the identity directory has no identity file
- **THEN** a new keypair is generated and written to the directory before use

#### Scenario: Identity stable across restart

- **WHEN** the service starts twice against the same identity directory
- **THEN** both runs present the identical public identity (same fingerprint)

#### Scenario: Distinct directories yield distinct identities

- **WHEN** two services start against two different identity directories
- **THEN** their fingerprints differ

#### Scenario: Private key file permissions

- **WHEN** the identity file is written
- **THEN** it is created with owner read/write only (0600)

### Requirement: Public identity fingerprint

A public identity SHALL have a stable, comparable fingerprint derived by hashing both public keys. The fingerprint SHALL be the key under which a device is stored and referenced.

#### Scenario: Same identity, same fingerprint

- **WHEN** the same public identity is fingerprinted twice
- **THEN** the two fingerprints are equal

### Requirement: Public identity encoding

A public identity SHALL encode to a single compact URL-safe string suitable for a QR code or hand-paste, and SHALL decode back to the identical identity. Decoding SHALL tolerate surrounding whitespace and SHALL reject malformed input.

#### Scenario: Encode/decode round-trip

- **WHEN** a public identity is encoded and then decoded
- **THEN** the decoded identity has the same fingerprint as the original

#### Scenario: Whitespace tolerated

- **WHEN** an encoded identity is decoded with leading/trailing whitespace
- **THEN** decoding succeeds

#### Scenario: Malformed input rejected

- **WHEN** a non-identity string is decoded
- **THEN** decoding returns an error

### Requirement: Local trust store

The system SHALL maintain a per-install trust store of trusted devices, each
recording a public identity, the peer's most-recently-advertised self-name, and an
optional local override name, keyed by fingerprint. It SHALL support add, remove,
lookup, membership test, and list. Every mutation SHALL be persisted atomically
(write-temp-then-rename) so a crash never leaves a half-written store. An empty or
missing store SHALL mean "trust nobody". The label shown for a device SHALL be the
local override if set, else the advertised self-name, else a fingerprint-derived
fallback. A local override SHALL win over any later advertised name and SHALL never
be sent to the peer.

#### Scenario: Add and query

- **WHEN** a device is added to the trust store
- **THEN** it is reported as trusted and retrievable by its fingerprint

#### Scenario: Persistence across reload

- **WHEN** devices are added and the store is reloaded from disk
- **THEN** all added devices are present

#### Scenario: Remove is idempotent

- **WHEN** a device is removed and removed again
- **THEN** neither call errors and the device is no longer trusted

#### Scenario: Blank name normalized

- **WHEN** a device is stored with no advertised name and no override
- **THEN** it is shown with a non-empty fingerprint-derived fallback label

#### Scenario: Local override wins and stays local

- **WHEN** a device has a local override name and later advertises a different self-name
- **THEN** the shown label stays the override and the override is not transmitted to the peer

### Requirement: Shared secret via ECDH

Two paired devices SHALL be able to derive an identical shared secret from one device's private key and the other's public key (X25519 ECDH). The derivation SHALL be symmetric.

#### Scenario: Both sides derive the same secret

- **WHEN** device A computes the shared secret with B's public key and B computes it with A's public key
- **THEN** the two secrets are equal and non-empty

### Requirement: Deterministic transfer code derivation

The system SHALL derive a croc-compatible code phrase from a shared secret and a per-transfer identifier using an HKDF, such that both paired devices compute the identical code and no human ever enters it. The code SHALL be at least croc's minimum length. Because croc derives the relay room from the code's first four characters, derived codes for distinct transfer identifiers SHALL spread across relay rooms rather than collide.

#### Scenario: Both sides derive the same code

- **WHEN** A and B derive a code from their shared secret and the same transfer id
- **THEN** the two codes are identical

#### Scenario: Relay rooms are spread

- **WHEN** codes are derived for many distinct transfer ids from one secret
- **THEN** the four-character relay-room prefixes are well distributed rather than repeated

### Requirement: Short authentication string (SAS)

The system SHALL derive a short numeric authentication string from the shared secret, identical on both devices, for the user to compare during pairing (man-in-the-middle protection). The SAS SHALL be the same on both sides.

#### Scenario: SAS matches on both sides

- **WHEN** A and B derive the SAS from their shared secret
- **THEN** the two SAS values are identical

### Requirement: Signed transfer offers

A send offer SHALL be signed by the sender's identity and carry the sender's public
identity, the sender's current self-name, a transfer id, a timestamp, and
file-count/byte-count metadata. Verification SHALL reject an offer whose sender is
not in the trust store, and SHALL reject an offer whose signature does not verify
(including any tampered field). The caller SHALL be able to distinguish "sender not
trusted" from "bad signature". On successful verification of a trusted sender, the
stored peer's advertised self-name SHALL be refreshed from the offer, unless a
local override is set for that device.

#### Scenario: Trusted, intact offer verifies

- **WHEN** an offer from a trusted device with a valid signature is verified
- **THEN** verification succeeds

#### Scenario: Untrusted sender rejected

- **WHEN** an offer is verified whose sender is not in the trust store
- **THEN** verification fails with an "untrusted" result

#### Scenario: Tampered offer rejected

- **WHEN** any field of a signed offer is altered after signing and the offer is verified against a trusting store
- **THEN** verification fails with a "bad signature" result

#### Scenario: Advertised name refreshes on next transfer

- **WHEN** a trusted device that has renamed itself sends a signed offer and no local override exists for it
- **THEN** its stored label updates to the new self-name carried by the offer

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

### Requirement: Pairing establishment over a short code

Two devices SHALL establish mutual trust by exchanging a single short code of the
same shape as a transfer code (`<4 digits>-<word>-<word>-<word>`), with no
long-lived link and no hand-pasted identity. The four digits SHALL select the
broker rendezvous room and the words SHALL be the SPAKE2 password, reusing the
quick-share rendezvous (`/ws` mailbox + PAKE), not the fingerprint (`/fp`) path.
Each device SHALL send its public identity and self-name inside the PAKE-keyed
sealed payload, so the broker never learns either the password or an unsealed
identity and cannot substitute one. A shown code SHALL be single-use and SHALL
expire after a bounded timeout. On a completed exchange BOTH devices SHALL persist
the other in the trust store (symmetric), regardless of which device showed the
code.

#### Scenario: Both sides end up trusting each other

- **WHEN** device A shows a code and device B redeems it and the exchange completes
- **THEN** A has B in its trust store and B has A in its trust store, each under the other's advertised self-name

#### Scenario: Wrong words fail without trusting

- **WHEN** a device redeems a code whose words do not match the shown code's SPAKE2 password
- **THEN** the exchange fails and neither device adds the other

#### Scenario: A code works once

- **WHEN** a code has already been redeemed to completion
- **THEN** a second redemption of the same code does not establish a new pairing

#### Scenario: A shown code expires

- **WHEN** a shown code is left unredeemed past the pairing timeout
- **THEN** it stops working and no pairing is established, with no error surfaced to the shower

#### Scenario: Broker cannot substitute an identity

- **WHEN** the relayed payloads are observed or altered by the broker
- **THEN** the exchange either completes with the genuine peer identities or fails, never with an attacker-chosen identity

### Requirement: Self-name generation and persistence

Each install SHALL own a single human-friendly self-name used to introduce it to
peers. The self-name SHALL be generated on first run as a random, non-identifying
two-word combination (e.g. `brave-otter`), SHALL be persisted so it is stable
across restarts, and SHALL be editable by the user. The self-name SHALL be the
value advertised during pairing and on transfer offers; it SHALL NOT be derived
from the OS hostname.

#### Scenario: Generated once on first run

- **WHEN** an install has no stored self-name
- **THEN** a random two-word self-name is generated and persisted before first use

#### Scenario: Stable across restart

- **WHEN** the app restarts without the user editing the name
- **THEN** the self-name is unchanged

#### Scenario: User edit persists

- **WHEN** the user sets the self-name to a new value
- **THEN** the new value is persisted and advertised to peers thereafter

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
