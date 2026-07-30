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
    PairingError, PairingOfferEvent, PairingPaired, ProgressEvent, TransferKind};
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

#[derive(serde::Serialize, serde::Deserialize, Clone, specta::Type)]
pub struct PairingPreview {
    pub fingerprint: String,
    pub sas: String,
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
            P::Offer { transfer_id, from_name, file_count, total_bytes } => PairingOfferEvent {
                transfer_id,
                from_name,
                file_count,
                total_bytes,
            }
            .emit(app),
            P::Accepted => PairingAccepted.emit(app),
            P::Declined => PairingDeclined.emit(app),
            P::Paired { name } => PairingPaired { name }.emit(app),
            P::Error { message } => PairingError { message }.emit(app),
        };
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
                self.notify_done(kind, &dest);
                DoneEvent { id, kind: kind_to_ts(kind), dest }.emit(app)
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
    fn notify_done(&self, kind: Kind, dest: &str) {
        use tauri_plugin_notification::NotificationExt;

        let focused = self
            .app
            .get_webview_window("main")
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false);
        if focused {
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

        let mut builder = self.app.notification().builder().title(title);
        if !body.is_empty() {
            builder = builder.body(body);
        }
        let _ = builder.show();
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
    } else if rest.starts_with("pair/") {
        // The whole URL is the pairing link (PairLink::decode strips the prefix).
        let app = app.clone();
        let link = url.to_string();
        tauri::async_runtime::spawn(async move {
            if let Some(pairing) = app.try_state::<PairingService>() {
                let _ = pairing.open_pair_link(&link).await;
            }
        });
    }
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
        .map(|d| DeviceInfo { fingerprint: d.fingerprint(), name: d.name })
        .collect())
}

#[tauri::command]
#[specta::specta]
async fn preview_pairing(
    pairing: State<'_, PairingService>,
    encoded: String,
) -> Result<PairingPreview, String> {
    let (fingerprint, sas, name) = pairing.preview(&encoded)?;
    Ok(PairingPreview { fingerprint, sas, name })
}

#[tauri::command]
#[specta::specta]
async fn trust(pairing: State<'_, PairingService>, encoded: String, name: String) -> Result<(), String> {
    pairing.trust(&encoded, &name)
}

/// Create a one-sided pairing link (show as text/QR). Whoever opens it pairs
/// with this device in a single step.
#[tauri::command]
#[specta::specta]
async fn create_pair_link(pairing: State<'_, PairingService>) -> Result<String, String> {
    pairing.create_pair_link()
}

/// Open a pairing link from another device: trust it and become mutually paired.
#[tauri::command]
#[specta::specta]
async fn open_pair_link(pairing: State<'_, PairingService>, link: String) -> Result<(), String> {
    pairing.open_pair_link(&link).await
}

#[tauri::command]
#[specta::specta]
async fn untrust(pairing: State<'_, PairingService>, fingerprint: String) -> Result<(), String> {
    pairing.untrust(&fingerprint)
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
            trusted_devices,
            preview_pairing,
            trust,
            untrust,
            create_pair_link,
            open_pair_link,
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
                // Quick-share rendezvous broker. Override with FLOPPY_BROKER_URL;
                // defaults to a local dev broker (`cargo run` in ./broker).
                broker_url: std::env::var("FLOPPY_BROKER_URL")
                    .unwrap_or_else(|_| "ws://127.0.0.1:8787/ws".to_string()),
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
                PairingService::new(&data_dir, manager.clone(), fp_broker_url, pairing_emitter)
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
