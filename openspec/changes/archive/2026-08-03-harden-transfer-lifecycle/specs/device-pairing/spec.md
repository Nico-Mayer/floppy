# device-pairing — delta

## ADDED Requirements

### Requirement: Cancelled offers are revoked at the receiver

Cancelling an outgoing offer that the other device has not yet answered SHALL send a signed
revocation for that transfer to the target, and SHALL clear the sender's outgoing-offer
record so later responses for that transfer are ignored. The receiver SHALL verify the
revocation against its trust store, drop the matching pending offer, and dismiss the
incoming prompt. A revocation for a transfer that is not pending (already accepted,
declined, expired, or never seen) SHALL change nothing.

#### Scenario: Revoked offer dismisses the receiver's prompt

- **WHEN** device A offers files to device B, B's prompt is showing, and A cancels the send
- **THEN** B receives A's signed revocation, the pending offer is dropped, and the prompt is
  dismissed with a short notice instead of waiting out its TTL

#### Scenario: Accept racing a revoke fails cleanly

- **WHEN** the user on B accepts at nearly the same moment A's revocation lands, and the
  revocation wins
- **THEN** the accept fails with the existing "no such incoming offer" error surfaced in the
  receive panel, and no fetch is started

#### Scenario: Stale response after cancel is ignored

- **WHEN** A cancels its offer and B's accept or decline response arrives afterwards
- **THEN** A ignores the response — no accepted or declined event is emitted for the
  cancelled transfer

#### Scenario: Re-offering immediately after cancel is not ghost-declined

- **WHEN** A cancels an unanswered offer to B and promptly offers again to the same device
- **THEN** B's revoked prompt no longer counts as a pending offer, so the new offer is
  surfaced rather than auto-declined as busy

#### Scenario: Forged revocation is rejected

- **WHEN** a revocation arrives that does not verify against a trusted identity for that
  transfer's sender
- **THEN** it is discarded and the pending offer and prompt are untouched

#### Scenario: Revocation after acceptance changes nothing

- **WHEN** B has already accepted the offer and started fetching when A's revocation arrives
- **THEN** the revocation finds no pending offer and is a no-op; the running transfer is
  governed by the transfer lifecycle, not the revocation
