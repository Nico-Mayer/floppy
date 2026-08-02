// floppy core (Tauri). Slice 1 is a skeleton: the commands exist and emit the
// typed event vocabulary (events.rs), but no real transport is wired yet. iroh
// lands in slice 2, the broker/pairing in slices 3-4. The command surface and
// event types are exported to TypeScript by tauri-specta, so the frontend never
// hand-writes the contract — `src/lib/ipc/bindings.ts` is generated.

mod error;
mod events;
mod fileinput;
mod pairing;
mod preview;
mod rendezvous;
#[cfg(test)]
mod testsupport;
mod transport;

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use error::CommandError;
use events::{
    CodeEvent, DeepLink, DoneEvent, ErrorEvent, PairingAccepted, PairingDeclined, PairingError,
    PairingOfferEvent, PairingPaired, PairingRequest, ProgressEvent, TransferKind,
};
use pairing::{PairCode, PairingEmitter, PairingEvent, PairingService};
use specta_typescript::Number;
use tauri::{AppHandle, Manager as _, State};
use tauri_plugin_log::log;
use tauri_specta::{collect_commands, collect_events, Builder, Event as _};
use transport::{Config, Kind, Manager, RelayConfig};

// ---- shared model types (exported to TS via specta::Type) ----

#[derive(serde::Serialize, serde::Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    // u64 is BigInt-forbidden by specta's TS exporter; emit plain JS `number`.
    #[specta(type = Number)]
    pub size: u64,
    pub is_dir: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, specta::Type)]
pub struct DeviceInfo {
    pub fingerprint: String,
    pub name: String,
}

/// Bridges the pairing service's events onto the frontend's typed pairing
/// events. The service stays UI-agnostic; this is the only place that knows both.
struct TauriPairingEmitter {
    app: AppHandle,
    /// Whether the app is in the foreground, maintained from window focus /
    /// lifecycle events (see `run()`). The OS ping only fires when it is not —
    /// a foregrounded app already shows the in-app prompt. Shared with the
    /// transfer emitter; a plain flag so a pairing task can read it without
    /// blocking on the UI event loop the way `is_focused()` does.
    foreground: Arc<AtomicBool>,
}

impl PairingEmitter for TauriPairingEmitter {
    fn emit(&self, event: PairingEvent) {
        use PairingEvent as P;
        let app = &self.app;
        let _ = match event {
            P::Offer { transfer_id, from_name, file_count, total_bytes } => {
                // Ping the OS when unfocused so a backgrounded user sees the offer;
                // the in-app prompt covers the focused case.
                self.notify_offer(from_name.clone(), file_count, total_bytes);
                PairingOfferEvent { transfer_id, from_name, file_count, total_bytes }.emit(app)
            }
            P::Accepted => PairingAccepted.emit(app),
            P::Declined { busy } => PairingDeclined { busy }.emit(app),
            P::Request { fingerprint, suggested_name, sas, via } => {
                PairingRequest { fingerprint, suggested_name, sas, via }.emit(app)
            }
            P::Paired { name } => PairingPaired { name }.emit(app),
            P::Error { message } => PairingError { message }.emit(app),
        };
    }
}

impl TauriPairingEmitter {
    /// Show an OS notification for an incoming offer, but only while the app is
    /// not in the foreground — a foregrounded app already shows the in-app
    /// prompt. The foreground check is a plain flag read (no UI-loop round
    /// trip); only the notification itself is queued onto the main thread.
    fn notify_offer(&self, from_name: String, file_count: u64, total_bytes: u64) {
        if self.foreground.load(Ordering::Relaxed) {
            return;
        }
        let files =
            if file_count <= 1 { "a file".to_string() } else { format!("{file_count} files") };
        let who = if from_name.is_empty() { "Someone".to_string() } else { from_name };
        let title = format!("{who} wants to send you {files}");
        let body = if total_bytes > 0 { format_bytes(total_bytes) } else { String::new() };

        let app = self.app.clone();
        let _ = self.app.run_on_main_thread(move || {
            use tauri_plugin_notification::NotificationExt;
            let mut builder = app.notification().builder().title(title);
            if !body.is_empty() {
                builder = builder.body(body);
            }
            let _ = builder.show();
        });
    }
}

/// Bridges the transport core's events onto the frontend's typed events, and
/// raises an OS notification when a transfer completes while the window is
/// unfocused. The core stays UI-agnostic (see transport::Emitter); this is the
/// only place that knows both vocabularies.
struct TauriEmitter {
    app: AppHandle,
    /// Last progress seen per kind, so the completion notification can say how
    /// much was sent / how many files were received (the Done event alone
    /// doesn't carry them). The final 100% progress always precedes Done.
    last: std::sync::Mutex<LastProgress>,
    /// Foreground flag shared with the pairing emitter (see there).
    foreground: Arc<AtomicBool>,
}

#[derive(Default)]
struct LastProgress {
    send_total: u64,
    recv_files: u64,
}

fn kind_to_ts(kind: Kind) -> TransferKind {
    match kind {
        Kind::Send => TransferKind::Send,
        Kind::Receive => TransferKind::Receive,
    }
}

impl transport::Emitter for TauriEmitter {
    fn emit(&self, event: transport::Event) {
        use transport::Event as E;
        let app = &self.app;
        let _ = match event {
            E::Code { id, kind, code } => CodeEvent { id, kind: kind_to_ts(kind), code }.emit(app),
            E::Progress { id, kind, stats } => {
                match kind {
                    Kind::Send => self.last.lock().unwrap().send_total = stats.total,
                    Kind::Receive => self.last.lock().unwrap().recv_files = stats.file_count,
                }
                ProgressEvent {
                    id,
                    kind: kind_to_ts(kind),
                    percent: stats.percent,
                    file: stats.file,
                    file_index: stats.file_index,
                    file_count: stats.file_count,
                    sent: stats.sent,
                    total: stats.total,
                    bps: stats.bps,
                    eta: stats.eta,
                }
                .emit(app)
            }
            E::Done { id, kind, dest } => {
                // Event first, notification after: the panel must not wait on
                // anything the notification does.
                let emitted =
                    DoneEvent { id, kind: kind_to_ts(kind), dest: dest.clone() }.emit(app);
                self.notify_done(kind, &dest);
                emitted
            }
            E::Failed { id, kind, error } => {
                ErrorEvent { id, kind: kind_to_ts(kind), code: error.code, message: error.message }
                    .emit(app)
            }
        };
    }
}

impl TauriEmitter {
    /// Show a completion notification, but only while the app is not in the
    /// foreground (a foregrounded app already shows the result). No notification
    /// on error or cancel — only Done reaches here.
    ///
    /// The foreground check is a plain flag read. Asking a window whether it is
    /// focused blocks the caller until the UI event loop answers — which is what
    /// made completion notifications land long after the transfer had finished,
    /// and is meaningless on mobile where a backgrounded app is not an
    /// "unfocused window". Only the notification is queued onto the main thread.
    fn notify_done(&self, kind: Kind, dest: &str) {
        if self.foreground.load(Ordering::Relaxed) {
            return;
        }
        let last = self.last.lock().unwrap();
        let (title, body) = match kind {
            Kind::Send => {
                let title = if last.send_total > 0 {
                    format!("Sent {}", format_bytes(last.send_total))
                } else {
                    "Send complete".to_string()
                };
                (title, String::new())
            }
            Kind::Receive => {
                let title = match last.recv_files {
                    0 => "Receive complete".to_string(),
                    1 => "Received 1 file".to_string(),
                    n => format!("Received {n} files"),
                };
                (title, dest.to_string())
            }
        };
        drop(last);

        let app = self.app.clone();
        let _ = self.app.run_on_main_thread(move || {
            use tauri_plugin_notification::NotificationExt;
            let mut builder = app.notification().builder().title(title);
            if !body.is_empty() {
                builder = builder.body(body);
            }
            let _ = builder.show();
        });
    }
}

/// Route an incoming `floppy://` deep link. `receive?code=…` prefills the code
/// (never auto-starts — drive-by download risk); `pair/…` opens a pairing link.
fn route_deep_link(app: &AppHandle, url: &str) {
    let Some(rest) = url.trim().strip_prefix("floppy://") else { return };
    if let Some(query) = rest.strip_prefix("receive?").or_else(|| rest.strip_prefix("receive/?")) {
        if let Some(code) =
            query.split('&').find_map(|p| p.strip_prefix("code=")).map(|c| c.replace('+', " "))
        {
            let _ = DeepLink { code }.emit(app);
        }
    }
    // Pairing is no longer a deep link: devices pair by scanning a QR or typing a
    // code on the Devices page (see redeem_pair_code).
}

/// Decimal byte sizes, matching the frontend's `formatBytes` (format.ts).
fn format_bytes(bytes: u64) -> String {
    if bytes < 1000 {
        return format!("{bytes} B");
    }
    let units = ["kB", "MB", "GB", "TB"];
    let mut value = bytes as f64 / 1000.0;
    let mut unit = 0;
    while value >= 1000.0 && unit < units.len() - 1 {
        value /= 1000.0;
        unit += 1;
    }
    if value < 10.0 {
        format!("{value:.1} {}", units[unit])
    } else {
        format!("{value:.0} {}", units[unit])
    }
}

// ---- transfer commands (transport-iroh fills these in, slice 2) ----

/// Resolve every picked value to a real path (see `fileinput`): plain paths
/// pass through; a `content://` URI is materialized into the app cache. Shared
/// by every command that hands paths to the transport, so the transport and
/// preview code only ever see real paths.
fn resolve_all(app: &AppHandle, paths: Vec<String>) -> Result<Vec<PathBuf>, CommandError> {
    paths
        .iter()
        .map(|p| fileinput::resolve_input_path(app, p).map_err(CommandError::other))
        .collect()
}

#[tauri::command]
#[specta::specta]
async fn send(
    app: AppHandle,
    manager: State<'_, Manager>,
    paths: Vec<String>,
) -> Result<(), CommandError> {
    // The transfer id is tracked internally; the UI keys off the code/progress
    // events, so the command just reports start success/failure.
    manager.send(resolve_all(&app, paths)?).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
async fn receive(manager: State<'_, Manager>, code: String) -> Result<(), CommandError> {
    // A human code phrase runs the quick-share PAKE; anything else is treated
    // as a raw iroh ticket (the copy/paste path).
    if rendezvous::code::looks_like_code(&code) {
        manager.quick_receive(&code).await?;
    } else {
        manager.receive(code).await?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
async fn cancel_send(manager: State<'_, Manager>) -> Result<(), CommandError> {
    manager.cancel(Kind::Send);
    Ok(())
}

#[tauri::command]
#[specta::specta]
async fn cancel_receive(manager: State<'_, Manager>) -> Result<(), CommandError> {
    manager.cancel(Kind::Receive);
    Ok(())
}

/// Quick one-off share over a human code phrase (code-phrase-share).
#[tauri::command]
#[specta::specta]
async fn quick_share(
    app: AppHandle,
    manager: State<'_, Manager>,
    paths: Vec<String>,
) -> Result<(), CommandError> {
    manager.quick_share(resolve_all(&app, paths)?).await?;
    Ok(())
}

// ---- file commands ----

#[tauri::command]
#[specta::specta]
async fn describe(app: AppHandle, paths: Vec<String>) -> Result<Vec<FileEntry>, CommandError> {
    // A `content://` pick is materialized here so the queue shows its real
    // display name and size; a plain path is stat'd in place. Unreadable picks
    // are skipped, as before.
    Ok(paths.iter().filter_map(|p| fileinput::resolve_entry(&app, p)).collect())
}

/// Delete the sandbox copies made for the send queue (a no-op on desktop, where
/// nothing is copied). The frontend calls this when the queue is cleared.
#[tauri::command]
#[specta::specta]
async fn clear_input_cache(app: AppHandle) -> Result<(), CommandError> {
    fileinput::reap(&app).map_err(|e| CommandError::other(e.to_string()))
}

/// Reveal a received folder in the file manager (desktop). Not offered on mobile:
/// received files land in the system-visible location (Android public Downloads,
/// iOS Files → On My iPhone → Floppy), reachable from the OS file apps, and there
/// is no reliable in-app intent to jump straight there.
#[tauri::command]
#[specta::specta]
async fn open_path(app: AppHandle, path: String) -> Result<(), CommandError> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_path(path, None::<&str>).map_err(|e| CommandError::other(e.to_string()))
}

// ---- pairing commands (device-pairing) ----

#[tauri::command]
#[specta::specta]
async fn identity(pairing: State<'_, PairingService>) -> Result<String, CommandError> {
    Ok(pairing.identity())
}

#[tauri::command]
#[specta::specta]
async fn trusted_devices(
    pairing: State<'_, PairingService>,
) -> Result<Vec<DeviceInfo>, CommandError> {
    Ok(pairing
        .trusted_devices()
        .into_iter()
        .map(|d| DeviceInfo { fingerprint: d.fingerprint(), name: d.label() })
        .collect())
}

/// Show a pairing code on this device (also rendered as a QR). Another device
/// redeems it to pair; this device confirms the request before trust is written.
/// Comes back with how long the code lasts, so the UI can count it down rather
/// than keep its own copy of the timeout.
#[tauri::command]
#[specta::specta]
async fn show_pair_code(pairing: State<'_, PairingService>) -> Result<PairCode, CommandError> {
    Ok(pairing.show_pair_code()?)
}

/// Redeem a pairing code shown on another device. `via` is "qr" when scanned or
/// "code" when typed, so the other device knows whether to show an SAS.
#[tauri::command]
#[specta::specta]
async fn redeem_pair_code(
    pairing: State<'_, PairingService>,
    code: String,
    via: String,
) -> Result<(), CommandError> {
    Ok(pairing.redeem_pair_code(&code, &via).await?)
}

/// This device's own name, shown to peers during pairing and on transfers.
#[tauri::command]
#[specta::specta]
async fn self_name(pairing: State<'_, PairingService>) -> Result<String, CommandError> {
    Ok(pairing.self_name())
}

/// Rename this device. The new name is advertised to peers on the next pairing
/// or transfer.
#[tauri::command]
#[specta::specta]
async fn set_self_name(
    pairing: State<'_, PairingService>,
    name: String,
) -> Result<(), CommandError> {
    Ok(pairing.set_self_name(&name)?)
}

#[tauri::command]
#[specta::specta]
async fn untrust(
    pairing: State<'_, PairingService>,
    fingerprint: String,
) -> Result<(), CommandError> {
    Ok(pairing.untrust(&fingerprint)?)
}

/// Approve a pending pairing (from a `PairingRequest`) and trust the peer under
/// `name`.
#[tauri::command]
#[specta::specta]
async fn confirm_pair(
    pairing: State<'_, PairingService>,
    fingerprint: String,
    name: String,
) -> Result<(), CommandError> {
    Ok(pairing.confirm_pair(&fingerprint, &name)?)
}

/// Discard a pending pairing without trusting the peer.
#[tauri::command]
#[specta::specta]
async fn dismiss_pair(
    pairing: State<'_, PairingService>,
    fingerprint: String,
) -> Result<(), CommandError> {
    pairing.dismiss_pair(&fingerprint);
    Ok(())
}

/// Rename an already-trusted device.
#[tauri::command]
#[specta::specta]
async fn rename_device(
    pairing: State<'_, PairingService>,
    fingerprint: String,
    name: String,
) -> Result<(), CommandError> {
    Ok(pairing.rename_device(&fingerprint, &name)?)
}

#[tauri::command]
#[specta::specta]
async fn accept(
    pairing: State<'_, PairingService>,
    transfer_id: String,
) -> Result<(), CommandError> {
    pairing.accept(&transfer_id).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
async fn decline(
    pairing: State<'_, PairingService>,
    transfer_id: String,
) -> Result<(), CommandError> {
    Ok(pairing.decline(&transfer_id).await?)
}

#[tauri::command]
#[specta::specta]
async fn send_to(
    app: AppHandle,
    pairing: State<'_, PairingService>,
    fingerprint: String,
    paths: Vec<String>,
) -> Result<(), CommandError> {
    pairing.send_to(&fingerprint, resolve_all(&app, paths)?).await?;
    Ok(())
}

/// The command + event registry. Shared by `run()` (which mounts it) and the
/// binding-export test (which writes the TypeScript), so the two can never drift.
fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            send,
            receive,
            cancel_send,
            cancel_receive,
            quick_share,
            describe,
            clear_input_cache,
            open_path,
            identity,
            self_name,
            set_self_name,
            trusted_devices,
            untrust,
            confirm_pair,
            dismiss_pair,
            rename_device,
            show_pair_code,
            redeem_pair_code,
            accept,
            decline,
            send_to,
        ])
        .events(collect_events![
            CodeEvent,
            ProgressEvent,
            DoneEvent,
            ErrorEvent,
            PairingOfferEvent,
            PairingAccepted,
            PairingDeclined,
            PairingRequest,
            PairingPaired,
            PairingError,
            DeepLink,
        ])
}

/// The one place the user-visible download root is resolved, per platform. The
/// per-transfer datetime layout (see the transport's `receive_dest`) sits
/// identically on top of whatever this returns.
///
/// - Desktop: the OS Downloads dir — a real path iroh writes to directly.
/// - iOS: the app **Documents** dir, surfaced in the Files app via `Info.plist`
///   (`UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace`).
/// - Android: the Downloads dir stands in as the *logical* root; the actual
///   bytes are routed to the **public** Downloads collection through
///   `tauri-plugin-android-fs` (scoped storage exposes no plain writable path).
///
/// `fallback` is used only if the platform resolver has no answer (returns the
/// app data dir), so a receive still lands somewhere rather than failing.
fn resolve_dest_root(app: &AppHandle, fallback: &Path) -> PathBuf {
    // iOS: the Files app surfaces the app's Documents dir *as* "Floppy" (the app
    // name), so receives go straight in — joining "floppy" would nest them under
    // Floppy/floppy/. Desktop/Android write into a "floppy" subfolder of the
    // Downloads dir, which has no such container.
    #[cfg(target_os = "ios")]
    {
        app.path().document_dir().unwrap_or_else(|_| fallback.to_path_buf())
    }
    #[cfg(not(target_os = "ios"))]
    {
        app.path().download_dir().unwrap_or_else(|_| fallback.to_path_buf()).join("floppy")
    }
}

/// No publish hook off Android: desktop and iOS export straight to their final,
/// user-visible path, so the transport reports the export path as-is.
#[cfg(not(target_os = "android"))]
fn android_publish(_app: &AppHandle) -> Option<transport::Publish> {
    None
}

/// Android publish hook: a finished transfer is exported to an app-private
/// `dest` folder (the only thing iroh can write to), then copied file-by-file
/// into the **public** Downloads collection under `floppy/<folder>/…` via
/// `tauri-plugin-android-fs`, and the private copy is reaped. Mirrors the
/// input-URI shim in `fileinput` in reverse (cache → public instead of
/// content-URI → cache). Returns a `Download/floppy/<folder>` display path for
/// the Done event.
///
/// MediaStore is per-entry, so files are created one at a time with the nested
/// `relative_path` carrying the folder; `create_new_file_with_pending` hides
/// each entry until its bytes are in, and `set_pending(false)` + `scan` reveal
/// and index it. No storage permission is needed on API 29+.
#[cfg(target_os = "android")]
fn android_publish(app: &AppHandle) -> Option<transport::Publish> {
    use std::io::{self, Write as _};
    use tauri_plugin_android_fs::{AndroidFsExt as _, PublicGeneralPurposeDir};

    let app = app.clone();
    Some(Arc::new(move |dest: &Path| -> io::Result<PathBuf> {
        let to_io = |ctx: String| move |e| io::Error::other(format!("{ctx}: {e}"));

        let folder = dest.file_name().and_then(|s| s.to_str()).ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "receive folder has no name")
        })?;

        let afs = app.android_fs();
        let store = afs.public_storage();

        // Our transfers are flat: one folder of files, names already sanitized to
        // bare basenames by the export step, so a single read_dir covers them.
        for entry in std::fs::read_dir(dest)? {
            let entry = entry?;
            if !entry.file_type()?.is_file() {
                continue;
            }
            let name = entry.file_name();
            let rel = Path::new("floppy").join(folder).join(&name);

            let uri = store
                .create_new_file_with_pending(None, PublicGeneralPurposeDir::Download, &rel, None)
                .map_err(to_io(format!("create {}", rel.display())))?;
            let mut out =
                afs.open_file_writable(&uri).map_err(to_io(format!("open {}", rel.display())))?;
            let mut src = std::fs::File::open(entry.path())?;
            io::copy(&mut src, &mut out)?;
            out.flush()?;
            drop(out);
            store.set_pending(&uri, false).map_err(to_io(format!("finalize {}", rel.display())))?;
            // Best-effort media-store index; a failure here only delays the file
            // showing up in the gallery/Downloads app, it is already written.
            let _ = store.scan(&uri);
        }

        // The public copy is the user's now; drop the app-private staging folder.
        let _ = std::fs::remove_dir_all(dest);
        Ok(Path::new("Download").join("floppy").join(folder))
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Install the process-wide rustls crypto provider before anything builds a
    // TLS client (the broker WebSocket, iroh's relay/DNS). Without a default,
    // rustls 0.23 panics on the first `ClientConfig::builder()` — which aborts
    // `run()` on Android, where nothing installs one transitively. Idempotent:
    // a second install (or a desktop build that already has one) just errors,
    // which we ignore.
    let _ = rustls::crypto::ring::default_provider().install_default();

    let builder = specta_builder();

    // Regenerate the frontend bindings on every desktop dev build; release
    // builds ship the checked-in copy. Gated `not(mobile)` because a phone's
    // working directory is read-only — the `.expect()` would abort `run()`
    // before the webview loads (the bindings are a desktop dev-loop artifact,
    // and `cargo test export_bindings` regenerates them there anyway).
    #[cfg(all(debug_assertions, not(mobile)))]
    builder
        .export(specta_typescript::Typescript::default(), "../src/lib/ipc/bindings.ts")
        .expect("failed to export typescript bindings");

    let tauri_builder = tauri::Builder::default();

    // Desktop: one instance owns the app data. Must be registered before every
    // other plugin — a second launch has to be rejected before it starts opening
    // the blob store. Its `deep-link` feature forwards the URL a second launch
    // carried to the running instance, so `floppy://` links keep working; all
    // this callback owes is to bring the existing window forward.
    #[cfg(desktop)]
    let tauri_builder =
        tauri_builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
                let _ = win.unminimize();
            }
        }));

    // Every `tracing::` call in the core reaches the OS log through this: stdout
    // (logcat on Android, oslog on iOS) plus a rotated file in the platform log
    // dir. Registered early so plugin and setup failures are logged too.
    // Quiet by default, verbose for floppy: iroh logs every packet at INFO and
    // its QUIC layer every wakeup at DEBUG, so a global INFO floor buries our own
    // lines several hundred to one. Raise a specific dependency here when
    // debugging it (`.level_for("iroh", Debug)`) rather than lifting the floor.
    let tauri_builder = tauri_builder.plugin(
        tauri_plugin_log::Builder::new()
            .level(log::LevelFilter::Warn)
            .level_for(
                "floppy_lib",
                if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                },
            )
            .build(),
    );

    // iOS: stop UIKit adding its own safe-area inset to the webview's scroll
    // view. It does that by default, so the page gets pushed down by UIKit and
    // again by our own `env(safe-area-inset-top)` padding, and the band UIKit
    // reserves paints the window colour instead of the app background. With it
    // off, the CSS in layout.css owns the safe areas on both phones.
    #[cfg(target_os = "ios")]
    let tauri_builder = tauri_builder.plugin(tauri_plugin_ios_webview_insets::init());

    // Android: the file-system plugin that lets a receive write into the public
    // Downloads collection (scoped storage exposes no plain path). Used by the
    // `android_publish` hook wired into the transport below.
    #[cfg(target_os = "android")]
    let tauri_builder = tauri_builder.plugin(tauri_plugin_android_fs::init());

    // Mobile only: haptic feedback for the handful of moments where something is
    // handed to you or taken away (see `lib/haptics.ts` for the list). There is no
    // desktop equivalent, and the frontend already gates every call on a coarse
    // pointer, so a desktop build has nothing to call.
    #[cfg(any(target_os = "android", target_os = "ios"))]
    let tauri_builder = tauri_builder.plugin(tauri_plugin_haptics::init());

    // Mobile only: the camera, for reading the QR another device is showing. The
    // plugin draws its own full-screen scanner and hands back the decoded string,
    // which the frontend feeds to `redeem_pair_code` as a scanned code. Desktop has
    // no such plugin and adds a device by typing instead.
    #[cfg(any(target_os = "android", target_os = "ios"))]
    let tauri_builder = tauri_builder.plugin(tauri_plugin_barcode_scanner::init());

    tauri_builder
        .plugin(tauri_plugin_opener::init())
        // Registered for Rust's sake only: `fileinput` uses its `FilePath` on
        // every platform and its resolver to read a `content://` pick on Android.
        // The frontend never calls it, so no capability grants `fs:*` — Rust-side
        // calls do not go through the ACL, and the webview gets nothing.
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        // Image previews for queued files: decode + downscale off the UI thread.
        .register_asynchronous_uri_scheme_protocol("thumb", |_ctx, request, responder| {
            let uri = request.uri().clone();
            let inm = request
                .headers()
                .get("If-None-Match")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());
            tauri::async_runtime::spawn_blocking(move || {
                let path = preview::path_from_uri(&uri);
                responder.respond(preview::respond(&path, inm.as_deref()));
            });
        })
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            // macOS uses the native hidden-inset title bar + traffic lights
            // (tauri.conf `titleBarStyle`/`hiddenTitle`). Windows drops the
            // native frame so the frontend TitleBar draws its own controls,
            // matching the old Wails build.
            #[cfg(windows)]
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_decorations(false);
            }

            // Ask once, up front: on iOS/Android an unasked-for notification is
            // dropped, so the first completed transfer would silently show
            // nothing. A no-op on desktop, which always reports granted.
            //
            // On the runtime's pool rather than a raw `std::thread`: this calls
            // into a plugin, and on Android a plugin call from a thread the JVM
            // has never seen has to attach itself to the VM first.
            {
                use tauri_plugin_notification::NotificationExt;
                let handle = app.handle().clone();
                tauri::async_runtime::spawn_blocking(move || {
                    if !matches!(
                        handle.notification().permission_state(),
                        Ok(tauri::plugin::PermissionState::Granted)
                    ) {
                        let _ = handle.notification().request_permission();
                    }
                });
            }

            // Build the transfer core and make it available to the commands.
            // The blob store lives in app data and is cleared on every launch —
            // it is scratch space for a transfer, not an archive, so resume by
            // hash holds within a session and not across a restart. Received
            // files land under the platform download dir/floppy.
            let handle = app.handle().clone();
            let data_dir = app.path().app_data_dir().unwrap_or_else(|_| std::env::temp_dir());
            // One resolver picks the user-visible root per platform (desktop
            // Downloads, iOS Documents, Android public Downloads); the datetime
            // layout is identical on top of it.
            let dest_root = resolve_dest_root(app.handle(), &data_dir);
            let config = Config {
                store_path: Some(data_dir.join("blobs")),
                dest_root,
                relay: RelayConfig::Default,
                bind_addr: None,
                // Quick-share rendezvous broker. Resolution order: runtime env
                // (desktop dev under mise, incl. FLOPPY_BROKER=local) → the URL
                // baked at compile time (mise sets FLOPPY_BROKER_URL for the
                // build) → the deployed default. A packaged mobile app has no
                // shell env, so without the last two it would silently fall back
                // to loopback and every quick share and pairing would fail.
                broker_url: std::env::var("FLOPPY_BROKER_URL")
                    .ok()
                    .or_else(|| option_env!("FLOPPY_BROKER_URL").map(str::to_string))
                    .unwrap_or_else(|| "wss://floppy-broker.up.railway.app/ws".to_string()),
                // A passive send that no one accepts stops serving after this,
                // freeing the slot and unpinning its files.
                send_ttl: std::time::Duration::from_secs(300),
            };
            let broker_url = config.broker_url.clone();

            // Foreground predicate for the notification gate, shared by both
            // emitters. Maintained from the window's focus events, which fire on
            // background/foreground on mobile too — the same meaning on all three
            // platforms, unlike `is_focused()` (see notify_done). Starts true: a
            // just-launched app is in front.
            let foreground = Arc::new(AtomicBool::new(true));
            if let Some(win) = app.get_webview_window("main") {
                let fg = foreground.clone();
                win.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(focused) = event {
                        fg.store(*focused, Ordering::Relaxed);
                    }
                });
            }

            let emitter = Arc::new(TauriEmitter {
                app: handle.clone(),
                last: std::sync::Mutex::new(LastProgress::default()),
                foreground: foreground.clone(),
            });
            // On Android, received files must land in the public Downloads
            // collection, reachable only through the media store — not the
            // app-private path iroh exports to. `android_publish` copies each
            // finished transfer folder there; every other platform exports in
            // place (`None`).
            let publish = android_publish(app.handle());
            let manager = tauri::async_runtime::block_on(Manager::new_with_publish(
                config, emitter, publish,
            ))?;

            // Trusted-device pairing: identity + trust store under app data, and
            // the fingerprint-routing broker (the mailbox URL's `/ws` → `/fp`).
            let fp_broker_url = broker_url
                .strip_suffix("/ws")
                .map_or_else(|| format!("{broker_url}/fp"), |base| format!("{base}/fp"));
            let pairing_emitter = Arc::new(TauriPairingEmitter {
                app: handle.clone(),
                foreground: foreground.clone(),
            });
            let pairing = tauri::async_runtime::block_on(async {
                PairingService::new(
                    &data_dir,
                    manager.clone(),
                    fp_broker_url,
                    broker_url.clone(),
                    pairing_emitter,
                )
            })?;

            app.manage(manager);
            app.manage(pairing);

            // Deep links: `floppy://receive?code=…` prefills the receive code;
            // `floppy://pair/…` completes a one-sided pairing. Registered after
            // state is managed so a cold-start URL can be routed.
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                // Runtime registration for dev on Linux/Windows (macOS uses the
                // bundled Info.plist entry from tauri.conf).
                #[cfg(any(target_os = "linux", windows))]
                let _ = app.deep_link().register("floppy");
                let dl_app = handle.clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        route_deep_link(&dl_app, url.as_str());
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::log;

    /// The whole logging setup rests on one thing: `tracing` macros fall back to
    /// emitting `log` records, which is what the log plugin's sinks consume. That
    /// held silently false for a long time (no subscriber, no plugin, 20 dead
    /// call sites), so pin it. Installing a tracing Subscriber or dropping
    /// tracing's `log` feature both break this test rather than the app.
    #[test]
    fn tracing_events_reach_the_log_crate() {
        static SEEN: AtomicUsize = AtomicUsize::new(0);
        struct Probe;
        impl log::Log for Probe {
            fn enabled(&self, _: &log::Metadata<'_>) -> bool {
                true
            }
            fn log(&self, record: &log::Record<'_>) {
                if record.args().to_string().contains("floppy-log-probe") {
                    SEEN.fetch_add(1, Ordering::SeqCst);
                }
            }
            fn flush(&self) {}
        }

        // Nothing else in the test binary installs a logger; if that ever
        // changes, this test has nothing to say rather than failing wrongly.
        if log::set_logger(&Probe).is_err() {
            return;
        }
        log::set_max_level(log::LevelFilter::Trace);
        tracing::info!("floppy-log-probe");
        assert_eq!(SEEN.load(Ordering::SeqCst), 1, "tracing did not emit a log record");
    }

    // Generate the TypeScript bindings headlessly (no window). Run with
    // `cargo test export_bindings`; the checked-in bindings.ts is the artifact.
    #[test]
    fn export_bindings() {
        super::specta_builder()
            .export(specta_typescript::Typescript::default(), "../src/lib/ipc/bindings.ts")
            .expect("failed to export typescript bindings");
    }
}
