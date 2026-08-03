# rendezvous-broker

## MODIFIED Requirements

### Requirement: Client rendezvous connection

A device's rendezvous client SHALL dial the broker, register its identity, and expose an incoming stream of decoded signals (offers, responses, ready, and synthesized unreachable notices). Concurrent sends over the client SHALL be safe. Closing the client SHALL end the incoming stream.

The client SHALL also expose the state of its own connection to the app, not only to its log: it SHALL report registered once the broker acknowledges its registration, and disconnected when the connection fails or closes while a retry is still pending. Reports SHALL arrive on the same one-way stream the signals use, so the app has one thing to read and no second channel to keep in step. A reconnection SHALL report registered again, so a link that recovers is visible without restarting the app.

Reporting connection state SHALL NOT change the client's reconnect behaviour: a failed attempt SHALL still be retried with backoff, and a report SHALL never be the reason a retry is skipped or a connection is dropped.

#### Scenario: Incoming offer decoded to a signal

- **WHEN** the broker delivers a routed offer payload to the client
- **THEN** the client decodes it and emits it on its signal stream

#### Scenario: Unreachable surfaced to the app

- **WHEN** the broker sends an unreachable notice to the client
- **THEN** the client emits an unreachable signal naming the target fingerprint

#### Scenario: Registration is reported

- **WHEN** the broker acknowledges the client's registration
- **THEN** the client reports itself registered on its incoming stream

#### Scenario: A dropped connection is reported

- **WHEN** the client's connection fails or is closed by the broker while the client intends to retry
- **THEN** the client reports itself disconnected on its incoming stream, and still retries with backoff

#### Scenario: A recovered connection is reported again

- **WHEN** a client that reported disconnected reconnects and re-registers
- **THEN** it reports itself registered again, with no restart needed
