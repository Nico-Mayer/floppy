# code-phrase-share

## ADDED Requirements

### Requirement: Human code phrase for quick sharing

The system SHALL support sending and receiving a transfer using a short human code phrase (leading digits plus hyphen-joined words, e.g. `7-crayon-mimic`) without adding or storing any device trust. Pasted codes SHALL be normalized (whitespace to hyphens) before use.

#### Scenario: Send with a generated code

- **WHEN** the user starts a quick share
- **THEN** the system generates a human code phrase and displays it for the user to share out-of-band

#### Scenario: Receive with a typed code

- **WHEN** the user enters a code phrase (with spaces or hyphens) to receive
- **THEN** the code is normalized and the transfer proceeds if a matching sender is waiting

### Requirement: PAKE-authenticated ticket exchange

The code phrase SHALL authenticate the exchange via a SPAKE2 PAKE run over a broker mailbox: the mailbox room is derived from the leading segment(s) of the code and the full normalized code is the PAKE password. The iroh ticket SHALL be exchanged encrypted under the PAKE-derived key. The broker SHALL NOT learn the key or see the plaintext ticket.

#### Scenario: Matching codes complete the handshake

- **WHEN** sender and receiver run SPAKE2 with the same code phrase in the same mailbox
- **THEN** both derive the same key and the receiver decrypts the sender's iroh ticket

#### Scenario: Wrong code fails to derive the key

- **WHEN** the receiver enters a code that does not match the sender's
- **THEN** the PAKE fails, no usable key is derived, and no ticket is revealed

### Requirement: NodeId binding prevents rendezvous MITM

The sender's iroh NodeId SHALL be bound into the PAKE exchange (in the transcript or the AEAD-encrypted payload) so a party that does not know the code cannot present a NodeId the receiver will accept. The receiver SHALL pin the dialed connection to the NodeId obtained from the exchange.

#### Scenario: Relay cannot substitute its own node

- **WHEN** a malicious or curious broker attempts to swap in a different iroh ticket/NodeId
- **THEN** the substituted NodeId is not authenticated by the code and the receiver refuses to transfer with it

### Requirement: No device trust side effects

Completing a quick share SHALL NOT add the peer to the trust store or otherwise create persistent pairing state.

#### Scenario: Quick share leaves no trust record

- **WHEN** a quick share transfer completes
- **THEN** the trust store is unchanged and no future codeless transfer with that peer is enabled

> The broker-side code-mailbox rendezvous this flow relies on is specified in the `rendezvous-broker` capability.
