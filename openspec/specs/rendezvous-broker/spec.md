# rendezvous-broker

## Purpose

Provide an accountless, stateless signalling broker that lets paired devices find each other and exchange signed control messages (offers, responses, ready, unreachable) over WebSocket, routing purely by device fingerprint. The broker never sees file contents — those move end-to-end over croc between the devices — and it authenticates connections solely by device-key signatures.

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
The broker SHALL require no user account and SHALL persist no state: routing is purely in-memory over live connections, authenticated only by device-key signatures. It SHALL never see file contents (those move end-to-end over croc between the devices).

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
