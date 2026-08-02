# download-destination (delta)

## ADDED Requirements

### Requirement: The resolved destination root is readable by the UI

The app SHALL expose the resolved destination root to the frontend through a command that
returns the same value transfers actually use, resolved by the same code path. The UI SHALL
NOT re-derive or hardcode the location.

Desktop settings SHALL show this value read-only and SHALL offer a control that opens the
folder in the platform's file manager through the existing open-path command. The command
SHALL NOT create the folder as a side effect of being read.

#### Scenario: The shown location is the used location

- **WHEN** desktop settings displays the save location
- **THEN** the value comes from the command and equals the root the next received transfer
  would land under

#### Scenario: The folder opens in the file manager

- **WHEN** the user activates the open-folder control in desktop settings
- **THEN** the resolved root opens in the platform's file manager

#### Scenario: Reading the root creates nothing

- **WHEN** the command is called before any transfer has been received
- **THEN** it returns the resolved path without creating the folder
