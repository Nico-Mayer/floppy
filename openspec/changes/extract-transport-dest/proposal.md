## Why

`transport/manager.rs` is a ~2070-line file mixing node lifecycle, the send
path, the receive path, the provider pump, rendezvous glue, and error
classification. Buried in it are four small, pure, synchronous functions that
decide where received files land and how names are made filesystem-safe:
`now_stamp`, `receive_dest`, `path_component`, and `sanitize_name`. These are the
most security-relevant pure logic in the module — `sanitize_name`/`path_component`
are the guard against a malicious collection entry writing outside the
destination — yet they sit unnamed in the middle of async transport code and are
easy to overlook. Pulling them into their own module makes the destination/naming
rules a named unit with its own focused tests, and takes a first, safe slice off
the whale.

## What Changes

- Add `src-tauri/src/transport/dest.rs` containing `now_stamp`, `receive_dest`,
  `path_component`, and `sanitize_name`, with the two existing path tests
  (`receive_dest_is_one_datetime_folder_per_transfer`,
  `now_stamp_is_filename_safe_and_sortable`) moved alongside them and expanded to
  cover `sanitize_name` directly (currently only exercised indirectly).
- `manager.rs` imports these from `dest` at its three call sites (receive-dest
  resolution ×2, export name sanitizing ×1). No signature or behavior change.
- Register `mod dest;` in `transport/mod.rs`; keep the functions crate-internal
  (`pub(crate)` or `pub(super)`), not part of any public API.

## Capabilities

### New Capabilities
<!-- none: pure code-move refactor, no spec-level behavior change -->

### Modified Capabilities
<!-- none: destination layout and name-sanitizing behavior are unchanged -->

## Impact

- `src-tauri/src/transport/manager.rs` (remove 4 fns + move 2 tests),
  new `src-tauri/src/transport/dest.rs`, one line in
  `src-tauri/src/transport/mod.rs`.
- No public API, command, event, wire, or on-disk-layout change. The destination
  folder scheme (`<root>/<datetime>[ from <device>]`, dedup suffixing) and the
  name-sanitizing rules are byte-for-byte identical.
- Gate: `cargo test` in `src-tauri/` stays green; the moved tests keep asserting
  the same behavior.
