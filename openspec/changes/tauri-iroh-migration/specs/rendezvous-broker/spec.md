# rendezvous-broker

The broker remains a standalone Go binary; its fingerprint-routing wire contract is unchanged. Only the client side moves into the Rust core. The broker gains an additive code-mailbox mode for quick-share rendezvous.

## ADDED Requirements

### Requirement: Code-mailbox rendezvous mode
The broker SHALL support a code-mailbox rendezvous mode alongside its existing fingerprint-routing mode. Two parties that join the same mailbox room (identified by a code-derived room id) SHALL have their handshake messages relayed to each other. The broker SHALL forward these messages as opaque blobs and SHALL NOT inspect, decrypt, or persist them.

#### Scenario: Mailbox pairs two waiting parties
- **WHEN** a sender and a receiver connect to the same mailbox room
- **THEN** the broker relays each party's handshake messages to the other as opaque blobs

#### Scenario: Blobs are not inspected
- **WHEN** the broker forwards a mailbox handshake message
- **THEN** it does so without parsing the contents, learning the PAKE key, or storing the message

#### Scenario: Mode isolation
- **WHEN** the broker serves the code-mailbox mode
- **THEN** the existing fingerprint-routing mode and its clients are unaffected
