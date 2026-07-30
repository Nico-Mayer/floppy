## ADDED Requirements

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
