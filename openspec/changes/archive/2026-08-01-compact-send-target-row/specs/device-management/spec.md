## MODIFIED Requirements

### Requirement: Entry to pairing from the send flow

The Send screen SHALL offer a way into the Add-a-device flow while no device is
paired, so a first-time user learns from the send flow that sending without a code
exists. This entry SHALL route to the Devices add flow rather than opening a separate
pasted-link dialog.

With no devices paired there is nothing to choose between, so the target picker SHALL
NOT be rendered and the entry SHALL take its place in the Send action row.

Once at least one device is paired the entry SHALL be gone: the picker listing the
paired devices is itself the evidence that the capability exists, and Devices is a
top-level destination reachable from the navigation. The Send screen SHALL NOT carry a
standing shortcut to pairing.

The entry SHALL NOT be an option inside the target picker in either case: a picker's
options are values, so a command placed among them would be a value to assistive
technology and unreachable by keyboard navigation.

#### Scenario: Send picker links to pairing

- **WHEN** the Send panel is idle with files queued and no devices are paired
- **THEN** the action row shows an entry that opens the Add-a-device flow on the
  Devices page, in place of the target picker, and no one-option picker is rendered

#### Scenario: The entry retires once a device is paired

- **WHEN** the Send panel is idle with files queued and at least one device is paired
- **THEN** the action row shows the target picker and the Send button only, with no
  pairing shortcut of its own

#### Scenario: Pairing is never an option inside the picker

- **WHEN** the user opens the Send target picker
- **THEN** its option list contains send targets only, and no Add-a-device command

#### Scenario: Send does not move between the two states

- **WHEN** the first device is paired while the Send panel is idle with files queued
- **THEN** the entry is replaced by the picker in the same slot and the Send button
  stays where it was
