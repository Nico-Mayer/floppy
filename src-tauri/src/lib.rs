// floppy core (Tauri). Slice 1 is a skeleton: the commands exist and emit the
// typed event vocabulary (events.rs), but no real transport is wired yet. iroh
// lands in slice 2, the broker/pairing in slices 3-4. The command surface and
// event types are exported to TypeScript by tauri-specta, so the frontend never
// hand-writes the contract — `src/lib/ipc/bindings.ts` is generated.

mod events;
mod pairing;
mod rendezvous;
mod transport;

use std::path::PathBuf;
use std::sync::Arc;

use events::{CodeEvent, DoneEvent, ErrorEvent, PairingAccepted, PairingDeclined,
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

/// Bridges the transport core's events onto the frontend's typed events. The
/// core stays UI-agnostic (see transport::Emitter); this is the only place that
/// knows both vocabularies.
struct TauriEmitter {
    app: AppHandle,
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
            E::Progress { id, kind, stats } => ProgressEvent {
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
            .emit(app),
            E::Done { id, kind, dest } => {
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
            let emitter = Arc::new(TauriEmitter { app: handle.clone() });
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
