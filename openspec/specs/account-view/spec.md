# account-view

## Purpose

The Account screen: the one place the account is presented, reachable one way per platform,
with sign-in as its body and copy scoped to syncing paired devices across installs. Until
accounts are real it is an honest preview — marked from the shared declaration, making no
external calls, showing a generic avatar glyph while signed out, and never duplicating the
device-name editor that belongs to the Devices screen.

## Requirements

### Requirement: The Account screen is the one place the account is presented

The app SHALL provide an Account screen at its own destination. On phone chrome it SHALL be
reachable as a bottom-bar destination; on desktop it SHALL be reachable through the sidebar's
account row. There SHALL be exactly one way in per platform, and no other surface SHALL
present a sign-in form.

The screen's body SHALL be the sign-in surface, and the copy SHALL scope the account to what
it will actually do: keep paired devices in sync across installs. It SHALL NOT promise
storage, backup, or any cloud relay of file content, because the transfer path is device to
device and an account does not change that.

#### Scenario: One sign-in surface

- **WHEN** the user looks for sign-in anywhere in the app
- **THEN** the Account screen is the only surface that offers it

#### Scenario: The copy scopes the account to syncing devices

- **WHEN** the Account screen renders
- **THEN** its description says it keeps paired devices in sync across installs and promises
  nothing about file storage or cloud transfer

### Requirement: The Account screen is an honest preview

Until accounts are real, the Account screen SHALL carry the shared preview marking, declared
once in the shared destination list, and its navigation entries SHALL carry the marker the
same way any preview destination's do. Its controls SHALL stay interactive but disconnected,
and it SHALL make no request to any external service.

#### Scenario: The Account destination is marked as a preview

- **WHEN** the Account screen or its navigation entry renders
- **THEN** both carry the preview marker, driven by the one shared declaration

#### Scenario: No external request while signed out

- **WHEN** the Account screen renders while signed out
- **THEN** no request is made to any external avatar, profile, or auth service

### Requirement: The Account avatar shows no face while signed out

While signed out, the account avatar SHALL render a generic glyph, not a fetched or generated
face. Everywhere the avatar appears — the Account screen, the sidebar account row, and the
phone bar item — SHALL use the same glyph, so signed-out state looks the same in every
placement.

#### Scenario: The same glyph everywhere

- **WHEN** the avatar renders in any placement while signed out
- **THEN** it is the same generic glyph, with no image fetched from anywhere

### Requirement: The Account screen does not duplicate this device's name

This device's name — the label other devices see after a pairing — SHALL stay on the Devices
screen and SHALL NOT be shown as an editable field on the Account screen. It is a property of
the device, not of the account, and two edit surfaces for one value could disagree.

#### Scenario: The name is edited on Devices only

- **WHEN** the user wants to change what other devices see this device as
- **THEN** the Devices screen is where the name is shown and edited, and the Account screen
  offers no second editor for it
