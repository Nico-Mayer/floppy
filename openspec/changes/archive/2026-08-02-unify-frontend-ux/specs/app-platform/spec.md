# app-platform — delta

## ADDED Requirements

### Requirement: Phones are portrait-only

On a phone, the app SHALL present in portrait orientation only: rotating the device SHALL
NOT rotate the UI. Every screen is designed portrait-first, and a landscape phone layout
does not exist, so offering the rotation would offer a broken view.

On iPad the app SHALL keep supporting rotation. Desktop windows are unaffected.

The lock SHALL be declared in each platform's own configuration source of truth — the iOS
project definition that the Xcode project is generated from, and the Android manifest — so
a regenerated project keeps the lock. On Android the lock SHOULD respect the user's
system-level display rotation preference where the platform offers that distinction.

#### Scenario: Rotating an iPhone changes nothing

- **WHEN** the app is open on an iPhone and the device is rotated to landscape
- **THEN** the UI stays in portrait

#### Scenario: Rotating an Android phone changes nothing

- **WHEN** the app is open on an Android phone and the device is rotated to landscape
- **THEN** the UI stays in portrait

#### Scenario: iPad still rotates

- **WHEN** the app is open on an iPad and the device is rotated
- **THEN** the UI rotates as it does today

#### Scenario: The lock survives project regeneration

- **WHEN** the iOS project is regenerated from its project definition
- **THEN** the portrait lock is still present in the generated project
