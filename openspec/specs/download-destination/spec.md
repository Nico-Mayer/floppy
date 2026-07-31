# download-destination

## Purpose

Where received files are written and how the destination root and per-transfer
folder are resolved on each platform (desktop, Android, iOS): received files land
in the user-visible download location under one flat, findable, filename-safe
layout, with iroh writing to a real file handle everywhere.

## Requirements

### Requirement: Received files land in the user-visible location on every platform

Received files SHALL be written to the platform's user-visible download location,
not an app-private directory that a file manager hides or an uninstall wipes.

- Desktop: the user's Downloads directory.
- Android: the public Downloads collection.
- iOS: the app's Documents directory, exposed to the Files app.

#### Scenario: Desktop writes to Downloads

- **WHEN** a transfer completes on desktop
- **THEN** the files are under the user's `Downloads/floppy/` and openable from a
  file manager

#### Scenario: Android writes to public Downloads

- **WHEN** a transfer completes on Android
- **THEN** the files appear under the device's public Downloads (`Download/floppy/…`)
  and are visible in the system Downloads/Files app, surviving an app uninstall

#### Scenario: iOS writes to a Files-visible location

- **WHEN** a transfer completes on iOS
- **THEN** the files are under the app's Documents (`floppy/…`) and appear in the
  Files app under On My iPhone → Floppy

### Requirement: One logical layout across platforms

Every transfer SHALL be written into its own folder directly under `floppy/`,
named `<datetime>` with ` from <device>` appended only when the sender is a trusted
device. `<datetime>` SHALL be `YYYY-MM-DD HH-MM-SS`: filename-safe (no `:`),
chronologically sortable, and including seconds. The layout SHALL be identical on
every platform, differing only in the resolved root. Single-file transfers SHALL
still be foldered.

#### Scenario: Trusted transfer names the sender

- **WHEN** a trusted device named "Nico's MacBook" sends files
- **THEN** the destination folder is `floppy/<datetime> from Nico's MacBook/`

#### Scenario: Code transfer is datetime-only

- **WHEN** files arrive via a one-time code (no trusted identity)
- **THEN** the destination folder is `floppy/<datetime>/` with no sender segment

#### Scenario: Flat, time-sortable tree

- **WHEN** several transfers have been received
- **THEN** every child of `floppy/` is a `<datetime>…` folder, so a default
  name sort lists them chronologically

#### Scenario: Single file is still foldered

- **WHEN** a transfer contains exactly one file
- **THEN** it is placed inside its own `<datetime>…` folder, not loose under `floppy/`

### Requirement: The code phrase is never used as a folder name

Because the code phrase is the transfer's SPAKE2 password, it SHALL NOT be written
into any folder or file name. The per-transfer folder SHALL be identified by the
datetime instead.

#### Scenario: Code phrase absent from the path

- **WHEN** a transfer received via code `9871-ember-satin-dagger` completes
- **THEN** neither the code nor any of its words appears in the destination path

### Requirement: Same-time transfers do not collide

Two transfers that resolve to the same folder name SHALL be kept apart rather than
one overwriting the other, using a numeric suffix (`-2`, `-3`, …).

#### Scenario: Two receives in the same second

- **WHEN** two transfers resolve to the same `<datetime>…` folder name
- **THEN** the second is written to `<name>-2/` and the first is left intact

### Requirement: Sender and path segments are sanitized

Any sender-supplied text used in a path (the device name) SHALL be sanitized so it
cannot escape the destination root or break the path: separators are flattened,
and an empty result drops the segment.

#### Scenario: Malicious device name cannot traverse

- **WHEN** the sender device name is `../../etc`
- **THEN** the segment is flattened (e.g. `..-..-etc`) and stays inside `floppy/`

#### Scenario: Blank device name drops the segment

- **WHEN** the sender device name is blank or whitespace
- **THEN** the folder is `floppy/<datetime>/` with no ` from …` segment

### Requirement: Android public write needs no storage permission on API 29+

On Android API 29+ the app SHALL write to public Downloads through the scoped
MediaStore path (via the file-system plugin) without requesting a storage
permission, and iroh SHALL receive a real writable file handle for the destination.

#### Scenario: No runtime storage prompt on receive

- **WHEN** a transfer completes on Android 10+ and files are written to public
  Downloads
- **THEN** no `READ_/WRITE_EXTERNAL_STORAGE` runtime permission prompt is shown
