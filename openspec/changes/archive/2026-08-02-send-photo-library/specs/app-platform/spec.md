## ADDED Requirements

### Requirement: The photo library is reached through the file dialog plugin

Picking from the photo library SHALL go through the same dialog plugin the app already uses
for files, asked for its media mode, rather than a second picker implementation or a second
plugin. The platform SHALL draw the picker; the app SHALL NOT render a gallery of its own.

Whatever the picker returns — a path, a `file://` URL, or a `content://` URI — SHALL be
resolved by the existing path-resolution shim, so a photo reaches the queue, the transport,
and the preview protocol through the same code as a file picked from the file picker.

Photo picking SHALL be offered only on the mobile targets that have a photo library, and SHALL
NOT be attempted on desktop.

#### Scenario: One picker implementation

- **WHEN** the user picks from the photo library on Android or on iOS
- **THEN** the platform's own photo picker is presented by the dialog plugin
- **AND** no second picker implementation or additional plugin is involved

#### Scenario: A picked photo resolves like any other pick

- **WHEN** the photo picker returns its result on either mobile platform
- **THEN** the app resolves it through the same shim used for a file pick
- **AND** the item is readable, sendable, and previewable with no photo-specific code path

#### Scenario: The platform declares what it needs

- **WHEN** a debug build is produced for Android and for iOS
- **THEN** opening the photo picker works on both without a runtime permission error, with iOS
  carrying a photo library usage string written in the same plain first-person voice as the
  app's other usage strings

#### Scenario: No photo picker on desktop

- **WHEN** the app runs on desktop
- **THEN** no photo library affordance is offered and no photo picker call is made

### Requirement: Cancelling a picker is an ordinary no-op

Dismissing any native picker without choosing SHALL leave the app exactly as it was: nothing
added, nothing removed, and no error surfaced. This SHALL hold on every platform, including
platforms whose picker reports a cancellation as a failure rather than an empty result.

A picker that returns nothing SHALL be treated the same way whatever the reason, so no
behaviour depends on matching a message.

#### Scenario: Cancelling the file picker

- **WHEN** the user opens the file picker and dismisses it without choosing, on any platform
- **THEN** the send queue is unchanged and no error is shown

#### Scenario: Cancelling the photo picker

- **WHEN** the user opens the photo picker and dismisses it without choosing, on any platform
- **THEN** the send queue is unchanged and no error is shown

#### Scenario: A picker that reports cancellation as a failure

- **WHEN** the platform reports a dismissed picker as an error rather than an empty result
- **THEN** the app still treats it as choosing nothing, and nothing reaches the user
