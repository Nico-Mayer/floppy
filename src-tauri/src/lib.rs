// floppy core (Tauri). Slice 1 is a skeleton: the commands exist and emit the
// typed event vocabulary (events.rs), but no real transport is wired yet. iroh
// lands in slice 2, the broker/pairing in slices 3-4. The command surface and
// event types are exported to TypeScript by tauri-specta, so the frontend never
// hand-writes the contract — `src/lib/ipc/bindings.ts` is generated.

mod events;
mod pairing;
mod preview;
mod rendezvous;
mod transport;

use std::path::PathBuf;
use std::sync::Arc;

use events::{CodeEvent, DeepLink, DoneEvent, ErrorEvent, PairingAccepted, PairingDeclined,
    PairingError, PairingOfferEvent, PairingPaired, PairingRequest, ProgressEvent, TransferKind};
use specta_typescript::Number;
use pairing::{PairingEmitter, PairingEvent, PairingService};
use tauri::{AppHandle, Manager as _, State};
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
    /// Show an OS notification for an incoming offer, but only while the window
    /// is unfocused — a foregrounded app already shows the in-app prompt. Like
    /// `notify_done`, everything that touches the window is queued onto the main
    /// thread and not waited on: `is_focused()` blocks on the UI event loop, and
    /// this runs on a pairing task that must not stall there.
    fn notify_offer(&self, from_name: String, file_count: u64, total_bytes: u64) {
        let files = if file_count <= 1 { "a file".to_string() } else { format!("{file_count} files") };
        let who = if from_name.is_empty() { "Someone".to_string() } else { from_name };
        let title = format!("{who} wants to send you {files}");
        let body = if total_bytes > 0 { format_bytes(total_bytes) } else { String::new() };

        let app = self.app.clone();
        let _ = self.app.run_on_main_thread(move || {
            use tauri_plugin_notification::NotificationExt;

            let focused = app
                .get_webview_window("main")
                .and_then(|w| w.is_focused().ok())
                .unwrap_or(false);
            if focused {
                return;
            }
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
            E::Code { id, kind, code } => {
                CodeEvent { id, kind: kind_to_ts(kind), code }.emit(app)
            }
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
                let emitted = DoneEvent { id, kind: kind_to_ts(kind), dest: dest.clone() }.emit(app);
                self.notify_done(kind, &dest);
                emitted
            }
            E::Failed { id, kind, error } => ErrorEvent {
                id,
                kind: kind_to_ts(kind),
                code: error.code.slug().to_string(),
                message: error.message,
            }
            .emit(app),
        };
    }
}

impl TauriEmitter {
    /// Show a completion notification, but only while the window is unfocused
    /// (a foregrounded app already shows the result). No notification on error
    /// or cancel — only Done reaches here.
    ///
    /// This runs on a transport task, and asking a window whether it is focused
    /// blocks the caller until the UI event loop answers — which is what made
    /// completion notifications land long after the transfer had finished. The
    /// title is built here (it needs `last`); everything that touches the
    /// window is queued onto the main thread and not waited on.
    fn notify_done(&self, kind: Kind, dest: &str) {
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

            let focused = app
                .get_webview_window("main")
                .and_then(|w| w.is_focused().ok())
                .unwrap_or(false);
            if focused {
                return;
            }
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
        if let Some(code) = query
            .split('&')
            .find_map(|p| p.strip_prefix("code="))
            .map(|c| c.replace('+', " "))
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

#[tauri::command]
#[specta::specta]
async fn send(manager: State<'_, Manager>, paths: Vec<String>) -> Result<(), String> {
    // The transfer id is tracked internally; the UI keys off the code/progress
    // events, so the command just reports start success/failure.
    manager
        .send(paths.into_iter().map(PathBuf::from).collect())
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
async fn receive(manager: State<'_, Manager>, code: String) -> Result<(), String> {
    // A human code phrase runs the quick-share PAKE; anything else is treated
    // as a raw iroh ticket (the copy/paste path).
    let started = if rendezvous::code::looks_like_code(&code) {
        manager.quick_receive(&code).await
    } else {
        manager.receive(code).await
    };
    started.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
async fn cancel_send(manager: State<'_, Manager>) -> Result<(), String> {
    manager.cancel(Kind::Send);
    Ok(())
}

#[tauri::command]
#[specta::specta]
async fn cancel_receive(manager: State<'_, Manager>) -> Result<(), String> {
    manager.cancel(Kind::Receive);
    Ok(())
}

/// Quick one-off share over a human code phrase (code-phrase-share).
#[tauri::command]
#[specta::specta]
async fn quick_share(manager: State<'_, Manager>, paths: Vec<String>) -> Result<(), String> {
    manager
        .quick_share(paths.into_iter().map(PathBuf::from).collect())
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

// ---- file commands (Tauri plugins replace these in slice 5) ----

/// Stat a path into a `FileEntry` (skipped if it cannot be read).
fn file_entry(path: &std::path::Path) -> Option<FileEntry> {
    let meta = std::fs::metadata(path).ok()?;
    Some(FileEntry {
        path: path.to_string_lossy().into_owned(),
        name: path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
        size: meta.len(),
        is_dir: meta.is_dir(),
    })
}

#[tauri::command]
#[specta::specta]
async fn describe(paths: Vec<String>) -> Result<Vec<FileEntry>, String> {
    Ok(paths.iter().filter_map(|p| file_entry(std::path::Path::new(p))).collect())
}

#[tauri::command]
#[specta::specta]
async fn open_path(app: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string())
}

// ---- pairing commands (device-pairing) ----

#[tauri::command]
#[specta::specta]
async fn identity(pairing: State<'_, PairingService>) -> Result<String, String> {
    Ok(pairing.identity())
}

#[tauri::command]
#[specta::specta]
async fn trusted_devices(pairing: State<'_, PairingService>) -> Result<Vec<DeviceInfo>, String> {
    Ok(pairing
        .trusted_devices()
        .into_iter()
        .map(|d| DeviceInfo { fingerprint: d.fingerprint(), name: d.label() })
        .collect())
}

/// Show a pairing code on this device (also rendered as a QR). Another device
/// redeems it to pair; this device confirms the request before trust is written.
#[tauri::command]
#[specta::specta]
async fn show_pair_code(pairing: State<'_, PairingService>) -> Result<String, String> {
    pairing.show_pair_code()
}

/// Redeem a pairing code shown on another device. `via` is "qr" when scanned or
/// "code" when typed, so the other device knows whether to show an SAS.
#[tauri::command]
#[specta::specta]
async fn redeem_pair_code(pairing: State<'_, PairingService>, code: String, via: String) -> Result<(), String> {
    pairing.redeem_pair_code(&code, &via).await
}

/// This device's own name, shown to peers during pairing and on transfers.
#[tauri::command]
#[specta::specta]
async fn self_name(pairing: State<'_, PairingService>) -> Result<String, String> {
    Ok(pairing.self_name())
}

/// Rename this device. The new name is advertised to peers on the next pairing
/// or transfer.
#[tauri::command]
#[specta::specta]
async fn set_self_name(pairing: State<'_, PairingService>, name: String) -> Result<(), String> {
    pairing.set_self_name(&name)
}

#[tauri::command]
#[specta::specta]
async fn untrust(pairing: State<'_, PairingService>, fingerprint: String) -> Result<(), String> {
    pairing.untrust(&fingerprint)
}

/// Approve a pending pairing (from a `PairingRequest`) and trust the peer under
/// `name`.
#[tauri::command]
#[specta::specta]
async fn confirm_pair(pairing: State<'_, PairingService>, fingerprint: String, name: String) -> Result<(), String> {
    pairing.confirm_pair(&fingerprint, &name)
}

/// Discard a pending pairing without trusting the peer.
#[tauri::command]
#[specta::specta]
async fn dismiss_pair(pairing: State<'_, PairingService>, fingerprint: String) -> Result<(), String> {
    pairing.dismiss_pair(&fingerprint);
    Ok(())
}

/// Rename an already-trusted device.
#[tauri::command]
#[specta::specta]
async fn rename_device(pairing: State<'_, PairingService>, fingerprint: String, name: String) -> Result<(), String> {
    pairing.rename_device(&fingerprint, &name)
}

#[tauri::command]
#[specta::specta]
async fn accept(pairing: State<'_, PairingService>, transfer_id: String) -> Result<(), String> {
    pairing.accept(&transfer_id).await.map(|_| ())
}

#[tauri::command]
#[specta::specta]
async fn decline(pairing: State<'_, PairingService>, transfer_id: String) -> Result<(), String> {
    pairing.decline(&transfer_id).await
}

#[tauri::command]
#[specta::specta]
async fn send_to(
    pairing: State<'_, PairingService>,
    fingerprint: String,
    paths: Vec<String>,
) -> Result<(), String> {
    pairing
        .send_to(&fingerprint, paths.into_iter().map(PathBuf::from).collect())
        .await
        .map(|_| ())
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = specta_builder();

    // Regenerate the frontend bindings on every dev build; release builds ship
    // the checked-in copy.
    #[cfg(debug_assertions)]
    builder
        .export(specta_typescript::Typescript::default(), "../src/lib/ipc/bindings.ts")
        .expect("failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
            {
                use tauri_plugin_notification::NotificationExt;
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    if !matches!(
                        handle.notification().permission_state(),
                        Ok(tauri::plugin::PermissionState::Granted)
                    ) {
                        let _ = handle.notification().request_permission();
                    }
                });
            }

            // Build the transfer core and make it available to the commands.
            // The blob store lives in app data (on-disk => resume by hash);
            // received files land in ~/Downloads/floppy.
            let handle = app.handle().clone();
            let data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir());
            let dest_root = dirs::download_dir()
                .unwrap_or_else(|| data_dir.clone())
                .join("floppy");
            let config = Config {
                store_path: Some(data_dir.join("blobs")),
                dest_root,
                relay: RelayConfig::Default,
                bind_addr: None,
                // Quick-share rendezvous broker. FLOPPY_BROKER_URL is what mise
                // sets; the fallback is a local dev broker (`mise run broker`)
                // for a build launched outside it.
                broker_url: std::env::var("FLOPPY_BROKER_URL")
                    .unwrap_or_else(|_| "ws://127.0.0.1:8787/ws".to_string()),
                // A passive send that no one accepts stops serving after this,
                // freeing the slot and unpinning its files.
                send_ttl: std::time::Duration::from_secs(300),
            };
            let broker_url = config.broker_url.clone();
            let emitter = Arc::new(TauriEmitter {
                app: handle.clone(),
                last: std::sync::Mutex::new(LastProgress::default()),
            });
            let manager = tauri::async_runtime::block_on(Manager::new(config, emitter))?;

            // Trusted-device pairing: identity + trust store under app data, and
            // the fingerprint-routing broker (the mailbox URL's `/ws` → `/fp`).
            let fp_broker_url = broker_url.strip_suffix("/ws").map_or_else(
                || format!("{broker_url}/fp"),
                |base| format!("{base}/fp"),
            );
            let pairing_emitter = Arc::new(TauriPairingEmitter { app: handle.clone() });
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
    // Generate the TypeScript bindings headlessly (no window). Run with
    // `cargo test export_bindings`; the checked-in bindings.ts is the artifact.
    #[test]
    fn export_bindings() {
        super::specta_builder()
            .export(specta_typescript::Typescript::default(), "../src/lib/ipc/bindings.ts")
            .expect("failed to export typescript bindings");
    }
}
