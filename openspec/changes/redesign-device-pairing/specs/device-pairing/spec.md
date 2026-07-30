## ADDED Requirements

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

## MODIFIED Requirements

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
