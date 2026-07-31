# transport-dest Specification

## Purpose
TBD - created by syncing change extract-transport-dest. Update Purpose after archive.
## Requirements
### Requirement: Receive-destination and name logic lives in one module

The functions that decide a receive's destination folder and sanitize
filesystem names SHALL live in a dedicated `transport::dest` module, separate
from the `Manager` and transport I/O in `transport::manager`. The module SHALL
expose `now_stamp`, `receive_dest`, `path_component`, and `sanitize_name` for
crate-internal use only (not part of any public API), and `manager` SHALL call
them from there.

#### Scenario: Destination logic is not defined in manager

- **WHEN** the change is complete
- **THEN** `transport/manager.rs` defines none of `now_stamp`, `receive_dest`,
  `path_component`, `sanitize_name`, and instead imports them from
  `transport::dest`

### Requirement: Destination and sanitizing behavior is unchanged

Moving the functions SHALL NOT change their behavior. Every input produces the
same output as before the change.

#### Scenario: One dated folder per transfer

- **WHEN** `receive_dest(root, peer, now)` is called
- **THEN** it returns `<root>/<now>` with ` from <device>` appended only when
  `peer` sanitizes to a non-empty component, and a `-N` suffix (N from 2) when
  the folder already exists — identical to the pre-change function

#### Scenario: Names cannot escape the destination

- **WHEN** `sanitize_name`/`path_component` is given a name containing path
  separators, `..`, `.`, or Windows-reserved characters
- **THEN** it returns a single safe component (or `"file"` for `sanitize_name`
  when nothing usable remains), so an export can never write outside its folder

#### Scenario: The stamp is filename-safe and sortable

- **WHEN** `now_stamp()` is called
- **THEN** it returns a `YYYY-MM-DD HH-MM-SS` local-time string with no
  characters a filesystem rejects, sorting chronologically as text

### Requirement: Tests move with the code and cover sanitizing directly

The existing destination tests SHALL move into the `dest` module, and
`sanitize_name` SHALL gain direct test coverage rather than only being exercised
through `receive_dest`.

#### Scenario: dest module owns its tests, green

- **WHEN** `cargo test` runs in `src-tauri/`
- **THEN** the destination and stamp tests run from the `dest` module and pass,
  including at least one test calling `sanitize_name` directly
