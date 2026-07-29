# device-pairing

The trusted-device pairing core is re-implemented in Rust (`ed25519-dalek`, `x25519-dalek`, `sha2`) with equivalent behavior and wire contract. Identity, fingerprint, encoding, trust store, ECDH, and SAS requirements are unchanged. Two requirements change because the trusted-device transfer is now bootstrapped by an iroh ticket carried in the signed offer rather than by a croc code derived from the shared secret.

## REMOVED Requirement: Deterministic transfer code derivation

**Reason**: croc is removed. The trusted-device transfer no longer derives a croc-compatible code phrase from the shared secret; it exchanges an iroh ticket inside the signed offer and dials the peer directly over iroh (authenticated by NodeId, see the modified offer requirement). The shared secret and SAS remain for pairing and MITM protection.

**Migration**: no user-facing migration — derived codes were never entered by humans. The HKDF-from-secret code path is deleted from the core.

## MODIFIED Requirements

### Requirement: Signed transfer offers

A send offer SHALL be signed by the sender's identity and carry the sender's public identity, a transfer id, a timestamp, file-count/byte-count metadata, and the sender's **iroh NodeId** (and/or an iroh ticket) for the transfer. Verification SHALL reject an offer whose sender is not in the trust store, and SHALL reject an offer whose signature does not verify (including any tampered field, the NodeId included). The caller SHALL be able to distinguish "sender not trusted" from "bad signature". A receiver SHALL dial only the NodeId carried in a verified offer, so the rendezvous cannot substitute a different node.

#### Scenario: Trusted, intact offer verifies

- **WHEN** an offer from a trusted device with a valid signature is verified
- **THEN** verification succeeds and the carried NodeId is used to dial the sender

#### Scenario: Untrusted sender rejected

- **WHEN** an offer is verified whose sender is not in the trust store
- **THEN** verification fails with an "untrusted" result

#### Scenario: Tampered offer rejected

- **WHEN** any field of a signed offer is altered after signing (including the NodeId) and the offer is verified against a trusting store
- **THEN** verification fails with a "bad signature" result

#### Scenario: Substituted node rejected

- **WHEN** the rendezvous delivers an offer whose NodeId was swapped without a valid signature
- **THEN** verification fails and the receiver does not dial the substituted node
