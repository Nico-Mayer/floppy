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

The system SHALL maintain a per-install trust store of trusted devices, each recording a public identity and a human display name, keyed by fingerprint. It SHALL support add, remove, lookup, membership test, and list. Every mutation SHALL be persisted atomically (write-temp-then-rename) so a crash never leaves a half-written store. An empty or missing store SHALL mean "trust nobody". A blank display name SHALL fall back to a fingerprint-derived label.

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

- **WHEN** a device is added with an empty name
- **THEN** it is stored with a non-empty fallback label

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

A send offer SHALL be signed by the sender's identity and carry the sender's public identity, a transfer id, a timestamp, and file-count/byte-count metadata. Verification SHALL reject an offer whose sender is not in the trust store, and SHALL reject an offer whose signature does not verify (including any tampered field). The caller SHALL be able to distinguish "sender not trusted" from "bad signature".

#### Scenario: Trusted, intact offer verifies

- **WHEN** an offer from a trusted device with a valid signature is verified
- **THEN** verification succeeds

#### Scenario: Untrusted sender rejected

- **WHEN** an offer is verified whose sender is not in the trust store
- **THEN** verification fails with an "untrusted" result

#### Scenario: Tampered offer rejected

- **WHEN** any field of a signed offer is altered after signing and the offer is verified against a trusting store
- **THEN** verification fails with a "bad signature" result

### Requirement: Signed accept/decline responses

A receiver's response to an offer SHALL be signed and carry the receiver's public identity, the transfer id, and the accept/decline decision. The sender SHALL verify the response is from a trusted device with an intact signature before acting on an acceptance, so a third party cannot spoof an acceptance to make a device start sending.

#### Scenario: Valid acceptance verifies

- **WHEN** a signed acceptance from a trusted device is verified
- **THEN** verification succeeds and the accept flag is trusted

#### Scenario: Forged or untrusted response rejected

- **WHEN** a response is verified whose signer is untrusted or whose signature is invalid
- **THEN** verification fails and the sender does not start sending
