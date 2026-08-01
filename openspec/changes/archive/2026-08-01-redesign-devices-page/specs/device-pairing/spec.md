## ADDED Requirements

### Requirement: A shown code reports its lifetime

The command that shows a pairing code SHALL return, with the code, how long that code
will work, in whole seconds. The value SHALL be the same bound the core enforces on the
pairing session, so the UI can count a code down without duplicating the timeout.

The lifetime SHALL be derived from the single constant the core times the session out
with; there SHALL NOT be a second copy of that duration anywhere, in Rust or in the
frontend.

A code SHALL keep behaving exactly as before once shown: single-use, expiring quietly
on the bound with no error raised to the shower.

#### Scenario: Showing a code returns its lifetime

- **WHEN** the frontend asks the core to show a pairing code
- **THEN** it receives the code and a positive number of seconds the code lasts

#### Scenario: The reported lifetime matches the enforced one

- **WHEN** the reported lifetime is compared with the timeout the pairing session is bounded by
- **THEN** they are the same value, read from one constant

#### Scenario: Reporting the lifetime changes nothing else

- **WHEN** a code is shown and left unredeemed past its lifetime
- **THEN** it stops working with no error surfaced to the shower, as before
