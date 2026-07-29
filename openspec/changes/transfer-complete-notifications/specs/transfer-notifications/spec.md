# transfer-notifications

## ADDED Requirements

### Requirement: Send completion notification

The system SHALL show an OS desktop notification when a send transfer completes while the app window is not focused. The notification title SHALL state the total bytes sent in humanized decimal form (e.g., "Sent 412 MB"), matching the in-app byte formatting. If final transfer stats are unavailable, the title SHALL fall back to "Send complete".

#### Scenario: Send completes while window backgrounded

- **WHEN** a send transfer emits its done event and the app window is not focused
- **THEN** an OS notification with title "Sent <size>" is shown, where <size> is formatted from the final progress stats' total bytes

#### Scenario: Send completes without final stats

- **WHEN** a send transfer emits its done event while unfocused and no matching final progress stats were captured
- **THEN** an OS notification with title "Send complete" is shown

### Requirement: Receive completion notification

The system SHALL show an OS desktop notification when a receive transfer completes while the app window is not focused. The notification title SHALL state the number of files received with correct pluralization (e.g., "Received 3 files", "Received 1 file"), and the notification SHALL carry the destination folder path. If final transfer stats are unavailable, the title SHALL fall back to "Receive complete".

#### Scenario: Receive completes while window backgrounded

- **WHEN** a receive transfer emits its done event with a destination folder and the app window is not focused
- **THEN** an OS notification with title "Received <N> file(s)" is shown and its payload carries the destination folder path

#### Scenario: Single file received

- **WHEN** a receive transfer of exactly one file completes while unfocused
- **THEN** the notification title reads "Received 1 file"

### Requirement: Notification click opens destination folder

The system SHALL open the receive destination folder in the platform file manager when the user clicks a receive completion notification.

#### Scenario: User clicks receive notification

- **WHEN** the user clicks a receive completion notification whose payload carries a destination path
- **THEN** the destination folder is opened via the same path-opening behavior as the in-app "open folder" action

#### Scenario: Notification response without destination

- **WHEN** a notification response arrives without a destination path in its payload
- **THEN** nothing is opened

### Requirement: No notification while window focused

The system SHALL NOT show a completion notification when the app window is focused at the moment the transfer completes, regardless of transfer duration.

#### Scenario: Transfer completes in foreground

- **WHEN** a send or receive transfer completes and the app window is focused
- **THEN** no OS notification is shown

### Requirement: No notification on error or cancel

The system SHALL NOT show an OS notification for failed transfers or cancelled transfers.

#### Scenario: Transfer fails

- **WHEN** a transfer emits an error event
- **THEN** no OS notification is shown and any captured stats for that transfer are discarded

#### Scenario: Transfer cancelled

- **WHEN** a transfer is cancelled (no terminal event is emitted)
- **THEN** no OS notification is shown

### Requirement: Notification sound

Completion notifications SHALL play the platform default notification sound, carried by the OS notification itself (no in-app audio).

#### Scenario: Notification arrives

- **WHEN** a completion notification is shown
- **THEN** the platform default notification sound plays

### Requirement: Graceful degradation without OS notification support

The system SHALL start and operate normally when OS notifications are unavailable (e.g., macOS unbundled dev builds lacking a bundle identifier) or when the user denies notification authorization; completion notifications become silent no-ops.

#### Scenario: Notification service fails to start

- **WHEN** the OS notification service fails during startup
- **THEN** the app starts normally, logs a warning, and transfer completions emit no notification

#### Scenario: User denies authorization

- **WHEN** the user denies the notification permission prompt
- **THEN** transfers work normally and no notifications are attempted
