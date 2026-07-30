# device-pairing

## MODIFIED Requirements

### Requirement: One-sided pairing links

A device SHALL be able to show a pairing link (text/QR) that another device
opens to establish **mutual** trust over the fingerprint channel, authenticated
end-to-end by a SPAKE2 exchange over the link secret. Trust SHALL NOT be written
on the initiator without explicit user confirmation, and either side SHALL be
able to name the resulting device.

#### Scenario: Opener consents by opening

- **WHEN** a user opens a pairing link on their device
- **THEN** that device trusts the link's initiator directly (opening is the
  consent) and the pairing handshake runs over the fp channel

#### Scenario: Initiator confirms before adding

- **WHEN** a device completes the pairing handshake against a link this device is showing
- **THEN** this device does NOT yet trust it; it raises a confirm-and-name prompt
- **AND** the peer is added to the trust store only if the user approves, under the name the user gives (defaulting to the peer's suggested name)
- **AND** dismissing the prompt discards the peer without trusting it

#### Scenario: Name and rename trusted devices

- **WHEN** a user renames a trusted device in the Devices list
- **THEN** the new name is persisted in the trust store and shown wherever the device appears (the list, the send target picker, incoming-offer prompts)

#### Scenario: Showing a link raises no error

- **WHEN** a user shows a pairing link and no one opens it
- **THEN** the link expires quietly and no error is surfaced
