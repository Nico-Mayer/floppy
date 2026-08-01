// Image previews for queued files, served to the webview over the `thumb://`
// custom protocol — the Tauri equivalent of the Go build's `/localfile` route.
// Ported behavior: only known image types, a size gate, session caching via
// ETag + max-age, and a downscale of the formats the `image` crate can decode
// (png/jpeg/gif); everything else is streamed as-is and the webview decodes it.
//
// A webview decodes an image at full resolution regardless of the tile size it
// paints, so a queue of 20 MB photos would otherwise cost hundreds of MB of
// bitmap to draw a row of ~180 px tiles — hence the downscale.
//
// Preview budgets (max source pixels, decode concurrency) are platform-
// conditional: lower and serialized on mobile, where the process is killed for
// far less memory than a laptop's. Path handling is not a concern here —
// previews always run on a real path (the picker's sandbox copy on mobile; see
// `fileinput`), so a `content://` URI never reaches this decoder.

use std::io::Cursor;
use std::path::Path;
use std::time::UNIX_EPOCH;

use tauri::http::{Response, StatusCode};

/// Longest edge of a generated thumbnail (a tile is ~150–200 px; 2× headroom).
const THUMB_MAX_DIM: u32 = 384;
/// Files this small are streamed untouched — re-encoding saves nothing.
const THUMB_MIN_SOURCE_BYTES: u64 = 256 << 10;
/// Refuse to decode beyond this many pixels (a bitmap that big is a worse
/// problem than a missing preview). Phone-bounded on mobile, where the process
/// is killed for far less memory than a laptop's; the gate falls through to
/// streaming the original, so a rejected decode just means no thumbnail.
#[cfg(not(mobile))]
const THUMB_MAX_SOURCE_PIXELS: u64 = 80 << 20;
#[cfg(mobile)]
const THUMB_MAX_SOURCE_PIXELS: u64 = 24 << 20;

/// Serialize decodes on mobile (concurrency 1): a phone cannot afford several
/// full-resolution bitmaps in flight at once. On desktop this is a no-op and
/// decodes run concurrently, one per `spawn_blocking` request.
#[cfg(mobile)]
fn decode_permit() -> std::sync::MutexGuard<'static, ()> {
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Image types worth handing to the webview as a thumbnail; others keep a glyph.
const PREVIEW_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "ico"];
/// The subset `image` can decode here, so we can downscale rather than ship the
/// original. The rest are streamed as-is.
const THUMBNAIL_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif"];

/// Decode the `path` query/component out of a `thumb://` request URI. Tauri
/// percent-encodes the file path into the URI path; decode it back.
pub fn path_from_uri(uri: &tauri::http::Uri) -> String {
    let raw = uri.path().trim_start_matches('/');
    percent_encoding::percent_decode_str(raw).decode_utf8_lossy().into_owned()
}

fn ext_of(path: &str) -> String {
    Path::new(path)
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

fn content_type(ext: &str) -> &'static str {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        _ => "application/octet-stream",
    }
}

fn status(code: StatusCode) -> Response<Vec<u8>> {
    Response::builder().status(code).body(Vec::new()).unwrap()
}

/// Build the preview response for `path`, honoring an `If-None-Match` validator.
/// Runs on a blocking thread (it decodes whole images).
pub fn respond(path: &str, if_none_match: Option<&str>) -> Response<Vec<u8>> {
    let ext = ext_of(path);
    if !PREVIEW_EXTS.contains(&ext.as_str()) {
        return status(StatusCode::FORBIDDEN);
    }
    let Ok(meta) = std::fs::metadata(path) else {
        return status(StatusCode::NOT_FOUND);
    };
    if !meta.is_file() {
        return status(StatusCode::NOT_FOUND);
    }

    // Validator covers everything the output depends on: an edited file (new
    // mtime/size) misses, and so does a change to THUMB_MAX_DIM.
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let etag = format!("\"{:x}-{:x}-{:x}\"", mtime, meta.len(), THUMB_MAX_DIM);
    if if_none_match.is_some_and(|inm| inm.contains(&etag)) {
        return cached(StatusCode::NOT_MODIFIED, &etag, None, Vec::new());
    }

    // A decodable format big enough to be worth shrinking: build a PNG thumb.
    // Any surprise (truncated file, an unsupported feature) falls through to
    // streaming the original, which the webview may still render.
    if THUMBNAIL_EXTS.contains(&ext.as_str()) && meta.len() > THUMB_MIN_SOURCE_BYTES {
        // Hold the mobile decode permit across the dimension probe and decode,
        // so at most one full-resolution bitmap is ever in flight on a phone.
        #[cfg(mobile)]
        let _permit = decode_permit();
        if let Ok((w, h)) = image::image_dimensions(path) {
            if (w as u64) * (h as u64) > THUMB_MAX_SOURCE_PIXELS {
                return status(StatusCode::FORBIDDEN);
            }
        }
        if let Some(png) = thumbnail(path) {
            return cached(StatusCode::OK, &etag, Some("image/png"), png);
        }
    }

    // Stream the original.
    match std::fs::read(path) {
        Ok(bytes) => cached(StatusCode::OK, &etag, Some(content_type(&ext)), bytes),
        Err(_) => status(StatusCode::NOT_FOUND),
    }
}

/// Decode, downscale to THUMB_MAX_DIM on the longest edge, re-encode as PNG.
fn thumbnail(path: &str) -> Option<Vec<u8>> {
    let img = image::open(path).ok()?;
    let thumb = img.thumbnail(THUMB_MAX_DIM, THUMB_MAX_DIM); // preserves aspect
    let mut buf = Cursor::new(Vec::new());
    thumb.write_to(&mut buf, image::ImageFormat::Png).ok()?;
    Some(buf.into_inner())
}

fn cached(code: StatusCode, etag: &str, content_type: Option<&str>, body: Vec<u8>) -> Response<Vec<u8>> {
    let mut b = Response::builder()
        .status(code)
        .header("ETag", etag)
        .header("Cache-Control", "private, max-age=300");
    if let Some(ct) = content_type {
        b = b.header("Content-Type", ct);
    }
    b.body(body).unwrap()
}
