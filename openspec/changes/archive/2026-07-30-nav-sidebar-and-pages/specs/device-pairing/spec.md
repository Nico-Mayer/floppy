# device-pairing

## MODIFIED Requirements

### Requirement: Pairing entry points

Pairing SHALL live on a dedicated page that is the single home for it, reachable
from the sidebar and from the send panel. The page SHALL show this device's
QR/link, an "I have a link" paste field, and the paired-devices list with
rename/remove. There SHALL be no separate add-device dialog duplicating the QR.

#### Scenario: One pairing home

- **WHEN** the user opens the Pair devices page
- **THEN** it shows this device's QR + copy-link, a paste field for another device's link, and the list of paired devices with rename and remove

#### Scenario: Add a device from the send panel

- **WHEN** the user chooses to add a device from the send panel
- **THEN** the app navigates to the Pair devices page (no modal), where the pairing logic lives

#### Scenario: Confirm prompt is never hidden

- **WHEN** a device pairs against a link this device is showing and the confirm-and-name prompt appears
- **THEN** it is the only pairing overlay on screen, so it cannot be hidden behind another dialog
