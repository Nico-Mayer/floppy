// The one place that knows a picked file may not be a filesystem path.
//
// On desktop the picker hands back plain paths. On Android it hands back
// `content://` URIs that `std::fs` cannot open; on iOS `file://` URLs that
// already point at a real sandbox copy (the dialog uses `asCopy: true`). This
// shim turns whatever the picker returns into a real path that the transport
// (`add_path`) and the preview server (`thumb://`) can both use unchanged:
//
//   · plain path / `file://`  → passthrough (iOS is already a sandbox copy)
//   · `content://` URI        → open via tauri-plugin-fs, stream-copy into the
//                                app cache at constant memory, return that path
//
// iroh-blobs 0.103 has no stream import — `add_path` needs a real path — so the
// copy is required, not a convenience. Copies land under one cache subdir and
// are reaped together when the send queue clears (see `reap`).

use std::hash::{Hash as _, Hasher as _};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::str::FromStr as _;

use tauri::{AppHandle, Manager as _};
use tauri_plugin_fs::{FilePath, FsExt as _, OpenOptions};

use crate::FileEntry;

/// Copies materialized for the send queue live here, so the whole set can be
/// reaped with one `remove_dir_all` when the queue clears.
fn cache_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_cache_dir()
        .unwrap_or_else(|_| std::env::temp_dir())
        .join("floppy-queue")
}

/// A picked value classified by how it must be read.
enum Picked {
    /// Already a real filesystem path (a plain path, or a `file://` URL that
    /// resolves to one). Used as-is.
    Plain(PathBuf),
    /// A URI (`content://`) that `std::fs` cannot open; must be copied out
    /// through the platform resolver.
    Uri(FilePath),
}

/// Decide how a picked string must be read. `FilePath::from_str` treats a value
/// with a URL scheme longer than one char as a URL (so a Windows `C:\…` drive
/// letter stays a path); a `file://` URL that resolves to a real path is Plain.
fn classify(input: &str) -> Picked {
    match FilePath::from_str(input) {
        Ok(FilePath::Path(p)) => Picked::Plain(p),
        Ok(FilePath::Url(url)) => match url.to_file_path() {
            // `file://` → the sandbox path it points at (iOS already copied it).
            Ok(p) => Picked::Plain(p),
            // `content://` and friends: no filesystem path, must be resolved.
            Err(()) => Picked::Uri(FilePath::Url(url)),
        },
        // FromStr is Infallible, but keep the total match honest.
        Err(_) => Picked::Plain(PathBuf::from(input)),
    }
}

/// The file name to show for a picked value. On Android a `content://` URI has
/// no name in its path, so ask the content resolver (DISPLAY_NAME); on desktop
/// this is the path's basename. Sanitized to a bare file name so a resolver
/// answer can never carry a path separator into the cache.
fn display_name(app: &AppHandle, input: &str) -> String {
    let raw = app.path().file_name(input).unwrap_or_default();
    Path::new(&raw)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| "file".into())
}

/// Stream `reader` into a fresh file named `name` under `dir`, at constant
/// memory. Returns the written path and its byte length. Pure (no AppHandle) so
/// the copy path is unit-testable off-device.
fn materialize(dir: &Path, name: &str, mut reader: impl Read) -> io::Result<(PathBuf, u64)> {
    std::fs::create_dir_all(dir)?;
    let dest = dir.join(name);
    let mut out = io::BufWriter::new(std::fs::File::create(&dest)?);
    let copied = io::copy(&mut reader, &mut out)?;
    out.flush()?;
    Ok((dest, copied))
}

/// A dedicated subdir per input, keyed by a stable hash of the picked value, so
/// two picks that share a display name do not clobber each other and re-picking
/// the same URI is idempotent.
fn slot_dir(app: &AppHandle, input: &str) -> PathBuf {
    let mut h = std::collections::hash_map::DefaultHasher::new();
    input.hash(&mut h);
    cache_dir(app).join(format!("{:016x}", h.finish()))
}

/// Resolve a picked value to a real path, copying a `content://` URI into the
/// cache. `send`/`quick_share`/`send_to` call this; a plain path (including a
/// cache copy a prior `describe` already made) passes straight through, so the
/// copy happens at most once per pick.
pub fn resolve_input_path(app: &AppHandle, input: &str) -> Result<PathBuf, String> {
    match classify(input) {
        Picked::Plain(p) => Ok(p),
        Picked::Uri(fp) => {
            let name = display_name(app, input);
            let file = app
                .fs()
                .open(fp, OpenOptions::new().read(true).clone())
                .map_err(|e| format!("open {input}: {e}"))?;
            let (path, _) = materialize(&slot_dir(app, input), &name, file)
                .map_err(|e| format!("copy {input}: {e}"))?;
            Ok(path)
        }
    }
}

/// Resolve a picked value into a queue `FileEntry` for `describe`: real path,
/// display name, and size. A `content://` URI is materialized here (size is the
/// copied length); a plain path is stat'd in place. Returns `None` for an
/// unreadable pick, matching the old `describe` behavior.
pub fn resolve_entry(app: &AppHandle, input: &str) -> Option<FileEntry> {
    match classify(input) {
        Picked::Plain(p) => {
            let meta = std::fs::metadata(&p).ok()?;
            Some(FileEntry {
                path: p.to_string_lossy().into_owned(),
                name: p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
                size: meta.len(),
                is_dir: meta.is_dir(),
            })
        }
        Picked::Uri(fp) => {
            let name = display_name(app, input);
            let file = app.fs().open(fp, OpenOptions::new().read(true).clone()).ok()?;
            let (path, size) = materialize(&slot_dir(app, input), &name, file).ok()?;
            Some(FileEntry { path: path.to_string_lossy().into_owned(), name, size, is_dir: false })
        }
    }
}

/// Delete every sandbox copy made for the send queue. Called when the queue is
/// cleared or a transfer ends; a no-op when nothing was copied (desktop).
pub fn reap(app: &AppHandle) -> io::Result<()> {
    let dir = cache_dir(app);
    match std::fs::remove_dir_all(&dir) {
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        r => r,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_plain_path_passes_through() {
        assert!(matches!(classify("/var/data/photo.jpg"), Picked::Plain(_)));
    }

    #[test]
    fn classify_file_url_resolves_to_path() {
        // A `file://` URL is a real sandbox path (iOS), not a copy candidate.
        match classify("file:///var/data/photo.jpg") {
            Picked::Plain(p) => assert_eq!(p, PathBuf::from("/var/data/photo.jpg")),
            Picked::Uri(_) => panic!("file:// should be a plain path"),
        }
    }

    #[test]
    fn classify_content_uri_needs_copy() {
        assert!(matches!(classify("content://media/external/images/media/42"), Picked::Uri(_)));
    }

    #[test]
    fn classify_windows_drive_is_a_path() {
        // A single-char scheme is a drive letter, not a URL.
        assert!(matches!(classify(r"C:\Users\me\photo.jpg"), Picked::Plain(_)));
    }

    #[test]
    fn materialize_stream_copies_content_and_reports_size() {
        let tmp = tempfile::tempdir().unwrap();
        let src = b"the quick brown fox";
        let (path, size) = materialize(tmp.path(), "note.txt", &src[..]).unwrap();
        assert_eq!(size, src.len() as u64);
        assert_eq!(std::fs::read(&path).unwrap(), src);
        assert_eq!(path.file_name().unwrap(), "note.txt");
    }

    #[test]
    fn reap_removes_only_the_queue_dir() {
        // Stand in for cache_dir with a temp dir, since reap() takes an AppHandle.
        let tmp = tempfile::tempdir().unwrap();
        let queue = tmp.path().join("floppy-queue");
        materialize(&queue.join("slot"), "a.bin", &b"x"[..]).unwrap();
        assert!(queue.exists());

        // Same logic as reap(): remove_dir_all, NotFound is fine.
        std::fs::remove_dir_all(&queue).unwrap();
        assert!(!queue.exists());
        // Second reap is a no-op, not an error.
        let again = match std::fs::remove_dir_all(&queue) {
            Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
            r => r,
        };
        assert!(again.is_ok());
    }
}
