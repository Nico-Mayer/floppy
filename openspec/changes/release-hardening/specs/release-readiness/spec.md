# release-readiness

## ADDED Requirements

### Requirement: Deployed rendezvous broker

The rendezvous broker SHALL be deployed and reachable over `wss://`, serving both the `/ws` code-mailbox mode and the `/fp` fingerprint-routing mode. The app's default broker URL SHALL point at the deployed endpoint (not a localhost dev default), and SHALL be overridable.

#### Scenario: App reaches the deployed broker

- **WHEN** the app starts with its default configuration
- **THEN** quick-share and trusted-device rendezvous connect to the deployed `wss://` broker without any local broker running

### Requirement: Documented relay strategy

The iroh relay strategy (n0 default vs self-hosted) SHALL be decided and documented, including how to configure a custom relay.

#### Scenario: Relay choice is documented

- **WHEN** a developer needs to know which relays transfers use or how to self-host
- **THEN** a document states the chosen strategy and the configuration steps

### Requirement: Cross-machine transfer validation

A quick-share transfer and a trusted-device transfer SHALL be verified between two real machines over the deployed broker and chosen relay, including resume after an interruption.

#### Scenario: Two-machine quick share

- **WHEN** one machine quick-shares a file and another enters the code
- **THEN** the transfer completes over the deployed broker + relay

#### Scenario: Resume after interrupt

- **WHEN** a transfer is interrupted and re-initiated with the same code/offer
- **THEN** it resumes from the partially received data rather than restarting
