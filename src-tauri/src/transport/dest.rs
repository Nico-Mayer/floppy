// Where a received transfer lands and how names are made filesystem-safe. Pure,
// synchronous logic split out of `manager` so the destination scheme and the
// path-traversal guard are a named unit with their own tests. The only side
// effect is `Path::exists` probing for a free folder name.

use std::path::{Path, PathBuf};

/// The flat, time-sorted stamp for one transfer's folder: local wall-clock as
/// `YYYY-MM-DD HH-MM-SS`. Filename-safe (no `:`, illegal on Windows), seconds
/// included so same-minute receives don't collide, and it sorts chronologically
/// by plain name order.
pub(crate) fn now_stamp() -> String {
    chrono::Local::now().format("%Y-%m-%d %H-%M-%S").to_string()
}

/// The folder one receive exports into: `<root>/<datetime>`, with ` from
/// <device>` appended only when the sender is a trusted, named device. Every
/// transfer gets its own folder (single file included), so two receives never
/// mix their files. The code phrase is never used — it is the transfer's SPAKE2
/// password — and the datetime is more findable later anyway.
pub(crate) fn receive_dest(root: &Path, peer: Option<&str>, now: &str) -> PathBuf {
    let name = match peer.map(path_component).filter(|p| !p.is_empty()) {
        Some(device) => format!("{now} from {device}"),
        None => now.to_string(),
    };

    // Two transfers can resolve to the same second (or a resumed/repeated
    // share); the later one gets its own folder instead of landing on the first.
    let first = root.join(&name);
    if !first.exists() {
        return first;
    }
    (2..1000)
        .map(|n| root.join(format!("{name}-{n}")))
        .find(|p| !p.exists())
        .unwrap_or(first)
}

/// One safe path component: no separators, no traversal, no characters Windows
/// refuses. Empty when nothing usable is left.
fn path_component(name: &str) -> String {
    let cleaned: String = name
        .trim()
        .chars()
        .map(|c| if std::path::is_separator(c) || "\\:*?\"<>|".contains(c) { '-' } else { c })
        .collect();
    Path::new(cleaned.trim())
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .filter(|n| !n.is_empty() && n != "." && n != "..")
        .unwrap_or_default()
}

/// Keep only the file name component, never a path — a malicious collection
/// entry must not write outside the destination folder.
pub(crate) fn sanitize_name(name: &str) -> String {
    let name = path_component(name);
    if name.is_empty() {
        "file".to_string()
    } else {
        name
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn receive_dest_is_one_datetime_folder_per_transfer() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        let now = "2026-07-31 14-05-09";

        // A code receive carries no trusted identity: datetime-only folder, no
        // ` from <device>` segment.
        assert_eq!(receive_dest(root, None, now), root.join(now));
        // A trusted, named device appends ` from <device>`.
        assert_eq!(
            receive_dest(root, Some("Nico's MacBook"), now),
            root.join("2026-07-31 14-05-09 from Nico's MacBook")
        );
        // A device name is never allowed to escape the root or break the path;
        // separators are flattened rather than dropped, so it still reads like
        // what the device is called.
        assert_eq!(
            receive_dest(root, Some("../../etc"), now),
            root.join("2026-07-31 14-05-09 from ..-..-etc")
        );
        assert_eq!(
            receive_dest(root, Some("a/b:c"), now),
            root.join("2026-07-31 14-05-09 from a-b-c")
        );
        // A blank/whitespace device drops the segment: datetime-only.
        assert_eq!(receive_dest(root, Some("   "), now), root.join(now));

        // The code phrase never reaches the path — `receive_dest` has no code
        // parameter at all, so the folder name is exactly the datetime (+device).
        let dest = receive_dest(root, None, now);
        assert_eq!(dest.file_name().unwrap(), now);

        // Two transfers that resolve to the same second must not land on top of
        // each other; the later one gets a numeric suffix.
        let first = receive_dest(root, None, now);
        std::fs::create_dir_all(&first).unwrap();
        let second = receive_dest(root, None, now);
        assert_eq!(second, root.join(format!("{now}-2")));
        std::fs::create_dir_all(&second).unwrap();
        assert_eq!(receive_dest(root, None, now), root.join(format!("{now}-3")));
    }

    #[test]
    fn now_stamp_is_filename_safe_and_sortable() {
        let s = now_stamp();
        // `YYYY-MM-DD HH-MM-SS`: 19 chars, no `:` (illegal on Windows), and the
        // only separators are `-`, ` `, so a plain name sort is chronological.
        assert_eq!(s.len(), 19, "unexpected stamp: {s}");
        assert!(!s.contains(':'), "stamp must not contain ':': {s}");
        assert!(s.chars().all(|c| c.is_ascii_digit() || c == '-' || c == ' '), "stamp: {s}");
    }

    #[test]
    fn sanitize_name_is_a_single_safe_component() {
        // A plain name passes through untouched.
        assert_eq!(sanitize_name("photo.jpg"), "photo.jpg");
        // Separators are flattened to `-`, so the result is a single component
        // with no way to climb out of its folder — traversal is neutralized, not
        // by taking the last segment but by leaving no separators at all.
        assert_eq!(sanitize_name("../../etc/passwd"), "..-..-etc-passwd");
        assert_eq!(sanitize_name("a/b/c.txt"), "a-b-c.txt");
        // Windows-reserved characters are replaced, not dropped.
        assert_eq!(sanitize_name("a:b*c?.txt"), "a-b-c-.txt");
        // Pure-dot and empty names leave nothing usable → the fallback.
        assert_eq!(sanitize_name(".."), "file");
        assert_eq!(sanitize_name("."), "file");
        assert_eq!(sanitize_name("   "), "file");
        assert_eq!(sanitize_name(""), "file");
    }
}
