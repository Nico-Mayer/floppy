## ADDED Requirements

### Requirement: Code entry clears after an attempt

The code-entry field on the Add-a-device screen SHALL be cleared once an attempt
finishes, whether it succeeded or failed. A pairing code is single-use and expires
after a bounded timeout, so a code that has just failed cannot succeed on a retry:
the other device has to show a new one. Leaving the spent code in the field invites
the user to press connect again and hit the same error.

The error itself SHALL still be shown, so clearing the field never costs the user the
explanation of what went wrong.

#### Scenario: A failed attempt empties the field

- **WHEN** entering a code fails for any reason, including the self-pair refusals
- **THEN** the field is empty and the error is shown

#### Scenario: A successful attempt empties the field

- **WHEN** entering a code adds the other device
- **THEN** the field is empty, ready for the next one

## MODIFIED Requirements

### Requirement: One-tap confirmation without naming

Redeeming a code (by scan or type) SHALL count as the redeemer's consent and SHALL
NOT prompt the redeemer for a confirmation or a name. The device that showed the
code SHALL present exactly one confirmation of the incoming request, identifying
the peer by its advertised self-name (e.g. "Add NicoPC?"). The confirmation SHALL
NOT require the user to enter a name; it MAY offer an inline rename. When the
request arrived via a scanned QR the confirmation SHALL NOT require an SAS
comparison; when it arrived via a typed code the confirmation SHALL show the SAS
for the user to compare.

A request whose peer turns out to be this same device SHALL NOT reach the
confirmation at all. The user SHALL never be asked to approve, name, or compare an
SAS for a pairing the app has already established cannot happen, so no confirmation
dialog SHALL appear and no device row SHALL be added to the list.

The refusal SHALL be reported on the side the user acted on, which is the side that
scanned or typed the code, as an ordinary error in the add-a-device flow. It SHALL
be worded for a normal person and SHALL say which of the two situations happened:

- The code belongs to this same device, e.g. "That's this device's own code."
- Two devices are running the same identity, e.g. "These devices have the same
  identity, so they can't be added."

The copy SHALL follow the existing pairing vocabulary: it SHALL NOT say "trusted",
"key", "fingerprint", or "pair link", and SHALL NOT use an em dash.

#### Scenario: Redeemer is not asked to confirm or name

- **WHEN** a device redeems a code
- **THEN** it proceeds to link without showing a confirmation dialog or a name prompt

#### Scenario: Shower confirms once, by name

- **WHEN** a pairing request reaches the device that showed the code
- **THEN** it shows a single confirmation naming the peer, with no required name input

#### Scenario: SAS shown only for typed codes

- **WHEN** the request originated from a typed code rather than a scanned QR
- **THEN** the confirmation displays the SAS to compare before accepting

#### Scenario: A device's own code raises no confirmation

- **WHEN** the user enters or scans the code this same device is showing
- **THEN** no confirmation dialog appears, no row is added to the device list, and the add-a-device flow shows an error saying it is this device's own code

#### Scenario: A shared identity raises no confirmation

- **WHEN** the user pairs two devices that are running a copy of the same identity
- **THEN** no confirmation dialog appears on either device, and the device that entered the code shows an error saying the two devices have the same identity

#### Scenario: Refusal copy stays in the pairing vocabulary

- **WHEN** either self-pair error is shown
- **THEN** its text avoids "trusted", "key", "fingerprint", "pair link", and em dashes
