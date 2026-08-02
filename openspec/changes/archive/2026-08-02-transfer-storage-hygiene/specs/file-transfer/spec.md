## ADDED Requirements

### Requirement: A transfer leaves behind no second copy of its payload

The app SHALL NOT retain an app-private copy of a transfer's content once that transfer has
finished. A send SHALL import its files by reference rather than copying them into the blob
store, and a receive SHALL export its files by moving them out of the store rather than
copying them. After a transfer completes, the only bytes the app is responsible for SHALL be
the received files at their destination.

Where a platform forces a copy before the transfer can begin — a `content://` URI or a photo
picker result that has no readable path — that copy is the app's to reap, and is covered by
the `app-platform` sandbox-copy requirement rather than this one.

#### Scenario: A send does not copy its payload into the store

- **WHEN** a send imports a file that is larger than the store's inline threshold
- **THEN** the store references the file in place
- **AND** the app's data directory does not grow by the size of that file

#### Scenario: A receive does not leave the content in the store

- **WHEN** a receive completes and its files have been exported
- **THEN** the store no longer holds a copy of the exported content
- **AND** the destination holds exactly one copy of each received file

#### Scenario: A source file changed mid-send fails cleanly

- **WHEN** a file is modified after it has been imported for a send and a receiver then
  fetches it
- **THEN** the receiver's content verification rejects the data and the transfer fails with a
  typed error
- **AND** no unverified or partially stale content is reported as delivered

#### Scenario: Exporting by reference never removes an exported file

- **WHEN** the store drops an entry whose data it only references, such as a file a platform
  publish hook has already relocated
- **THEN** the referenced file itself is not deleted

### Requirement: The blob store is scratch space, cleared at launch

The blob store SHALL be emptied when the transfer core is built, before it is opened, so no
content survives from a previous run of the app. Clearing SHALL tolerate the store not
existing yet, and SHALL NOT fail the app's startup if it cannot complete.

The store SHALL NOT be cleared at any other time. It therefore accumulates for the life of a
session, which is what keeps content-addressed resume working for a retry.

#### Scenario: A previous run's content does not survive

- **WHEN** the transfer core is built and the store directory holds content from an earlier run
- **THEN** that content is gone before any transfer can use it

#### Scenario: A first launch has nothing to clear

- **WHEN** the transfer core is built and no store directory exists yet
- **THEN** startup proceeds normally and the store is created

#### Scenario: A cancelled transfer keeps what it fetched

- **WHEN** a receive is cancelled
- **THEN** the partial content is left in the store and the send queue is unchanged

## MODIFIED Requirements

### Requirement: Content-addressed resume

Re-initiating the same transfer SHALL resume from locally held partial content, keyed by the
content's BLAKE3 hash, for as long as that content is held. Correctness SHALL NOT depend on
the process working directory, and no per-code working-directory folder SHALL be required.

Partial content SHALL be held for the life of a session, so a transfer interrupted and retried
without restarting the app resumes. It SHALL NOT be held across a restart: the store is
cleared at launch, so resume is a within-session property and the app SHALL NOT claim
otherwise.

#### Scenario: Resume an interrupted receive

- **WHEN** a receive is interrupted and later re-initiated for the same content, in the same
  session
- **THEN** already-received data is reused and only the missing data is fetched

#### Scenario: Resume after a restart starts over

- **WHEN** a receive is interrupted and re-initiated after the app has been restarted
- **THEN** the transfer runs from the beginning and completes normally

#### Scenario: No CWD dependency

- **WHEN** any transfer runs
- **THEN** correctness does not depend on the process working directory, and no per-code
  working-directory folder is required for resume

