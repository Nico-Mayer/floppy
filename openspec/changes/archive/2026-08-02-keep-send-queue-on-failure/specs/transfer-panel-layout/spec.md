## ADDED Requirements

### Requirement: The send queue survives a send that never sent

A send that ends without delivering its files SHALL leave the file selection exactly as it was.
This SHALL hold for every way a send can end that way and for either target:

- the user cancels it,
- the chosen device is offline or otherwise unreachable,
- the chosen device turns the offer down or is busy,
- the send fails to start at all.

Only two things SHALL empty the queue: the user emptying it (removing every file, or leaving the
done screen with "Send more files"), and a send that finished.

After any of those endings the Send panel SHALL return to its idle screen with the queue still
listed, the chosen target still chosen, and the failure, if there was one, reported inline above
the panel rather than as a toast. Starting the same send again SHALL need nothing re-picked.

#### Scenario: An offline device does not cost the selection

- **WHEN** files are queued and sent to a trusted device that is not online
- **THEN** the Send screen shows the failure inline and returns to idle
- **AND** the same files are still queued, in the same order, with the same target chosen

#### Scenario: A declined offer does not cost the selection

- **WHEN** the chosen device turns the offer down, or auto-declines because it is busy
- **THEN** the Send panel returns to idle with the queue and the chosen target untouched

#### Scenario: A send that fails to start does not cost the selection

- **WHEN** starting a send is refused before anything is served, for a code target or a device
  target
- **THEN** the failure is shown inline and the queue is untouched

#### Scenario: Failing and cancelling end the same way

- **WHEN** a trusted send is cancelled, and then an identical one fails because the device is
  offline
- **THEN** the panel lands in the same idle state both times, with the same queue

#### Scenario: Retrying needs no re-picking

- **WHEN** a send has failed and the user presses Send again once the other device is back
- **THEN** the transfer starts from the queue that was already there, with no picker involved
