# transfer-panel-layout

## MODIFIED Requirements

### Requirement: Trusted send panel states

The send panel SHALL reflect a trusted-device send's real progression —
offered, accepted, sending, done — driven by the events the frontend receives,
even though a trusted send emits no code phrase.

#### Scenario: Offered, awaiting acceptance

- **WHEN** a trusted send is offered and the peer has not answered
- **THEN** the panel shows the "waiting for a yes" state

#### Scenario: Peer accepts

- **WHEN** the peer accepts the offer (`PairingAccepted`)
- **THEN** the panel leaves "waiting for a yes" and shows the accepted/connecting state

#### Scenario: Bytes moving

- **WHEN** send progress events arrive for the trusted transfer
- **THEN** the panel shows the progress bar and byte counts, advancing to 100%

#### Scenario: Completed

- **WHEN** the send completes (`Done{Send}`)
- **THEN** the panel shows the sent/completion screen naming the device
