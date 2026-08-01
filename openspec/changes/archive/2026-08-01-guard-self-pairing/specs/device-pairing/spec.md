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

The trust store SHALL know the local install's own fingerprint, and SHALL NEVER hold
an entry for it. An add whose fingerprint equals the local fingerprint SHALL be
rejected with an error and SHALL NOT be persisted, whatever the caller. This is the
single backstop for the invariant: no other code path is relied upon to keep the
local identity out of the store. On load, a self-entry already present in the
persisted store SHALL be dropped and the cleaned store persisted, so an install that
recorded one before this rule existed heals on its next start with no migration step.

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

#### Scenario: Own identity cannot be added

- **WHEN** an add is attempted with the local install's own public identity
- **THEN** the add returns an error, the store is unchanged, and the local fingerprint is not reported as trusted

#### Scenario: Existing self-entry is purged on load

- **WHEN** a persisted trust store containing an entry for the local fingerprint is loaded
- **THEN** that entry is absent from the loaded store and the purged store is written back to disk

#### Scenario: Purge leaves genuine peers intact

- **WHEN** a persisted store containing both a self-entry and real peers is loaded
- **THEN** only the self-entry is dropped and every peer keeps its advertised name and local override

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

A device SHALL NOT pair with itself. Every cryptographic step of the exchange
succeeds when both sides are the same identity — SPAKE2 agrees because the password
is identical, and the SAS matches because an ECDH against one's own public key is
still deterministic — so identity equality SHALL be checked explicitly rather than
inferred from a handshake failure. Both sides SHALL perform the check on the peer
identity they unseal, before mutating the trust store:

- The device showing the code SHALL compare the redeemer's unsealed fingerprint to
  its own. On a match it SHALL abandon the exchange without adding anything to the
  trust store and without raising a confirmation to its user, and SHALL tell the
  redeemer why with a reply distinct from both a confirm and a user decline.
- The device redeeming the code SHALL compare the shower's fingerprint in the sealed
  reply to its own, and on a match SHALL fail the redemption without adding anything
  to the trust store.

The redeeming device SHALL know which pairing codes it is itself currently showing,
so it can distinguish the two shapes of self-pair and report the right one: the same
install redeeming a code it is displaying, versus two installs that hold the same
identity (a copied identity file) and therefore one fingerprint. Both SHALL be
refused; the two SHALL be distinguishable to the user.

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

#### Scenario: An install redeeming its own code is refused

- **WHEN** an install redeems a pairing code it is currently showing
- **THEN** the redemption fails, neither the showing side nor the redeeming side adds anything to the trust store, and the install's own list of devices is unchanged

#### Scenario: Two installs sharing one identity are refused

- **WHEN** a code is redeemed between two installs whose identity files are copies, so their fingerprints are equal
- **THEN** the exchange fails and neither install adds the other

#### Scenario: The two self-pair shapes are distinguishable

- **WHEN** a redemption is refused for identity equality
- **THEN** the reported reason says whether the code was one this install is showing or whether two installs share an identity

#### Scenario: Self-pair reply is distinct from a decline

- **WHEN** the showing device abandons an exchange because the redeemer's fingerprint is its own
- **THEN** the redeemer is told the identities are the same, and does not report it as the other device having refused

#### Scenario: A reflected identity does not reach the user

- **WHEN** a third party who has seen the displayed code redeems it and sends back the shower's own public identity
- **THEN** the shower raises no pairing confirmation, adds no device, and the third party is not trusted
