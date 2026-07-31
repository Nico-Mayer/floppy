## Context

Four pure, synchronous, side-effect-light functions live in the middle of the
2070-line `transport/manager.rs`:

- `now_stamp() -> String` — local-time `YYYY-MM-DD HH-MM-SS` (via `chrono`).
- `receive_dest(root, peer, now) -> PathBuf` — the per-transfer folder, with
  `-N` dedup suffixing (touches the filesystem only via `Path::exists`).
- `path_component(name) -> String` — one safe path component.
- `sanitize_name(name) -> String` — `path_component` with a `"file"` fallback.

Call sites in `manager.rs`: `receive_dest` at the two receive paths (private-
receive and quick/pump receive), `sanitize_name` at the export step. Tests
`receive_dest_is_one_datetime_folder_per_transfer` and
`now_stamp_is_filename_safe_and_sortable` already exist in the tests module;
`sanitize_name` and `path_component` are only covered transitively.

## Goals / Non-Goals

**Goals:**

- Isolate the destination/naming logic in `transport::dest` with its own tests.
- Add a direct `sanitize_name` test (the traversal guard deserves an explicit one).
- No behavior change, no public API surface.

**Non-Goals:**

- Not splitting `send`/`receive`/provider-pump out of `manager.rs` (separate,
  more debatable work — deferred).
- Not moving the error classifiers (`classify_connect_err`, `classify_get_err`,
  `broker_err`, `wrong_code_err`) — out of scope for this slice.
- No change to the folder scheme, dedup, or sanitizing rules.

## Decisions

**1. New file `transport/dest.rs`, `mod dest;` in `transport/mod.rs`.** Sits
beside `error`, `event`, `progress`, `manager` — same layer.

**2. Visibility `pub(crate)` (or `pub(super)`).** These are internal helpers;
they must not widen the transport public API (`mod.rs` re-exports only `Config`,
`Manager`, `Publish`, `RelayConfig`). `manager.rs` imports with
`use super::dest::{now_stamp, receive_dest, sanitize_name};` (`path_component`
stays an implementation detail of `dest`, `pub(crate)` only if a test needs it).

**3. `chrono` dependency stays put.** `now_stamp` is the only `chrono` user here;
it moves with the function, no Cargo change.

**4. Tests move into `#[cfg(test)] mod tests` in `dest.rs`.** The two existing
tests move verbatim; add `sanitize_name_is_a_single_safe_component` covering
separators, `..`, `.`, Windows-reserved chars, and the empty→`"file"` fallback.

## Risks / Trade-offs

- **Nearly zero risk** — a pure code move with unchanged signatures; the compiler
  catches a missed call site, and the moved tests catch a behavior slip.
- **Marginal indirection** (`super::dest::…`). Worth it: the traversal guard
  becomes a named, independently tested unit instead of a helper buried in async
  transport code.
- Does not, by itself, make `manager.rs` small — it is one deliberate first
  slice, chosen because it is the safest and most testable.
