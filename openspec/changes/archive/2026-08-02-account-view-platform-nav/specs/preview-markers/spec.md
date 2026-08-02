# preview-markers (delta)

## MODIFIED Requirements

### Requirement: A control that would state something false is removed, not marked

A marker declares that a screen is unfinished; it does not make a wrong value acceptable. A
control that would display or imply a value contradicting actual app behaviour SHALL be removed
until it can show the truth. Placeholder text SHALL NOT imitate a real value, such as a
plausible hostname or a real filesystem path.

A value read from the app itself is the truth and may be shown: the settings screen SHALL show
the save location only as the real resolved destination root, never as a hardcoded or
imagined path.

#### Scenario: No control asserts a wrong destination

- **WHEN** the settings screen shows a save location
- **THEN** the value shown is the real destination root the app resolved, not a hardcoded
  path, and if the real value cannot be read no location is shown at all

#### Scenario: No control offers a choice that does not exist

- **WHEN** the settings screen renders
- **THEN** it offers no switch for per-transfer folders, because that behaviour is unconditional
  and the switch would imply it can be turned off

#### Scenario: Placeholders do not imitate real values

- **WHEN** a preview text field shows placeholder text
- **THEN** that text does not read as a real hostname, path, or account

## ADDED Requirements

### Requirement: A partly real screen is marked per section

A screen that mixes connected sections with preview sections SHALL NOT be marked page-wide.
The preview marker SHALL sit on each unconnected section instead, so a marker never claims a
working control is a preview and a working section never lends credibility to a stub. A
destination whose screen has at least one connected section SHALL NOT carry the preview
marker in navigation.

#### Scenario: Only the stub sections are marked

- **WHEN** a screen renders with both connected and unconnected sections
- **THEN** each unconnected section carries the preview marker and the connected sections and
  the page title do not

#### Scenario: The navigation entry reads as connected

- **WHEN** a destination's screen has at least one connected section
- **THEN** its navigation entries carry no preview marker
