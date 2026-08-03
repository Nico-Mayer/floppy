## MODIFIED Requirements

### Requirement: Progress motion follows the rate without overshooting

Transfer progress SHALL be interpolated so that a fluctuating byte rate reads as smooth
movement rather than mechanical stepping. The interpolation SHALL live in one place — the
progress gauge's own transition between the values it is handed — rather than being applied
twice by a smoothing layer feeding an already-animating component. The displayed percentage
SHALL never exceed 100, and SHALL never appear to move backwards as a side effect of the
interpolation.

#### Scenario: Fluctuating rate reads smoothly

- **WHEN** a transfer's rate rises and falls during a transfer
- **THEN** the gauge's arc and its percentage move smoothly rather than jumping between values

#### Scenario: Progress never reads over 100

- **WHEN** a transfer reaches completion
- **THEN** the displayed percentage is clamped at 100 and the arc does not extend past full

#### Scenario: Smoothing is applied once

- **WHEN** the progress display is handed a new percentage
- **THEN** exactly one mechanism animates the change, and the value the gauge is given is the
  reported percentage rather than a separately smoothed one

#### Scenario: Progress is information, not decoration

- **WHEN** the user has reduced motion enabled
- **THEN** progress still animates between values, because the movement is the information
