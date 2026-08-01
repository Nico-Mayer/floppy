## 1. Create the dest module

- [x] 1.1 Add `src-tauri/src/transport/dest.rs`; add `mod dest;` to `src-tauri/src/transport/mod.rs`.
- [x] 1.2 Move `now_stamp`, `receive_dest`, `path_component`, `sanitize_name` verbatim into `dest.rs` with `pub(crate)` visibility (keep `path_component` private unless a test needs it).

## 2. Rewire manager.rs

- [x] 2.1 Remove the four functions from `manager.rs`; add `use super::dest::{now_stamp, receive_dest, sanitize_name};`.
- [x] 2.2 Confirm the three call sites (two `receive_dest`, one `sanitize_name`) compile unchanged.

## 3. Move and extend tests

- [x] 3.1 Move `receive_dest_is_one_datetime_folder_per_transfer` and `now_stamp_is_filename_safe_and_sortable` into `#[cfg(test)] mod tests` in `dest.rs`.
- [x] 3.2 Add `sanitize_name_is_a_single_safe_component`: assert separators/`..`/`.`/Windows-reserved chars collapse to one component and empty input yields `"file"`.

## 4. Verify

- [x] 4.1 `cargo test` in `src-tauri/` passes; the moved tests run from `dest`.
- [x] 4.2 `cargo clippy` clean; no unused imports or dead code left in `manager.rs`.
- [x] 4.3 Grep confirms `manager.rs` no longer defines any of the four functions.
