# rendezvous-broker

## Purpose

Provide an accountless, stateless signalling broker that lets devices find each other over
WebSocket: a fingerprint router that relays signed control messages between paired devices,
and a code mailbox that relays sealed handshake blobs between two parties holding the same
code. The broker never sees file contents, which move end to end over iroh between the
devices, and it never learns a code or a PAKE key.

## Requirements
### Requirement: Device registration with proof of ownership

The broker SHALL accept a WebSocket connection whose first message registers a public identity together with a signature proving ownership of that identity. The broker SHALL verify the signature against the registered public key before accepting the registration, and SHALL reject (close) a connection whose first message is not a valid registration.

#### Scenario: Valid registration accepted

- **WHEN** a client connects and sends a registration signed by its own key
- **THEN** the broker accepts it and acknowledges

#### Scenario: Bad registration rejected

- **WHEN** a client's registration carries a signature that does not verify for the given key
- **THEN** the broker closes the connection without registering it

### Requirement: Route signals to a target by fingerprint

The broker SHALL forward a routed message to the currently-connected client registered under the target fingerprint, delivering the opaque payload byte-for-byte. The broker SHALL NOT inspect or interpret the payload beyond its routing header.

#### Scenario: Payload delivered verbatim

- **WHEN** client A sends a routed message addressed to B's fingerprint
- **THEN** B receives the payload unchanged

### Requirement: Unreachable notice for offline targets

When a routed message targets a fingerprint that is not currently connected, the broker SHALL reply to the sender with an unreachable notice naming that fingerprint, rather than dropping the message silently.

#### Scenario: Target not connected

- **WHEN** A sends a routed message to a fingerprint with no live connection
- **THEN** A receives an unreachable notice carrying that fingerprint

### Requirement: One live connection per fingerprint

The broker SHALL hold at most one live connection per fingerprint. A new registration for a fingerprint that already has a connection SHALL take over the slot (the older connection is dropped), and a connection's teardown SHALL only clear the slot if it still points at that connection.

#### Scenario: Reconnect takes over

- **WHEN** a fingerprint already registered opens a second connection and registers again
- **THEN** the new connection owns the routing slot and the old one is dropped

### Requirement: No accounts, no persistence

The broker SHALL require no user account and SHALL persist no state: routing is purely in-memory over live connections, authenticated only by device-key signatures. It SHALL never see file contents, which move end to end over iroh between the devices.

#### Scenario: Stateless routing

- **WHEN** the broker restarts
- **THEN** no registration or routing state survives; clients simply reconnect and re-register

### Requirement: Client rendezvous connection

A device's rendezvous client SHALL dial the broker, register its identity, and expose an incoming stream of decoded signals (offers, responses, ready, and synthesized unreachable notices). Concurrent sends over the client SHALL be safe. Closing the client SHALL end the incoming stream.

#### Scenario: Incoming offer decoded to a signal

- **WHEN** the broker delivers a routed offer payload to the client
- **THEN** the client decodes it and emits it on its signal stream

#### Scenario: Unreachable surfaced to the app

- **WHEN** the broker sends an unreachable notice to the client
- **THEN** the client emits an unreachable signal naming the target fingerprint

### Requirement: WebSocket keepalive and dead-connection eviction

Both broker channels (the `/ws` code mailbox and the `/fp` fingerprint routing) SHALL keep idle WebSocket connections alive with an application-visible heartbeat and SHALL evict connections that stop responding, so a device that has sat idle behind a NAT or proxy stays reachable and a silently-dropped socket is detected rather than relayed into. The broker SHALL periodically send a ping (or equivalent keepalive frame) on an open connection and SHALL enforce a read deadline that closes the connection when no traffic or heartbeat response arrives within a bounded interval. On the client side, a registered device SHALL keep its own connection warm so it remains registered for routing between transfers. Eviction of a dead connection SHALL free any per-connection state (a fingerprint registration or a mailbox room slot) so the same device or room can be used again immediately.

#### Scenario: Idle connection stays registered

- **WHEN** a device registers on `/fp` and then sends no signals for longer than a proxy idle timeout while responding to heartbeats
- **THEN** its connection stays open and it remains reachable for routed signals

#### Scenario: Dead connection is evicted

- **WHEN** a connection stops responding to the heartbeat past the read deadline
- **THEN** the broker closes it and frees its fingerprint registration or mailbox room slot

#### Scenario: Freed slot is immediately reusable

- **WHEN** a device whose stale connection was evicted reconnects and re-registers under the same fingerprint
- **THEN** registration succeeds without waiting out the old connection

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

