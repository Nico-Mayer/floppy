// The event vocabulary the frontend subscribes to. Each type derives
// `tauri_specta::Event`, so its wire name and TypeScript listener are generated
// from the struct name (`ProgressEvent` -> `events.progressEvent`) — the old
// hand-written `croc:*` strings are gone, and croc is no longer named anywhere.
//
// Send and receive share one event each, distinguished by `kind`, instead of
// the old split `send:progress` / `recv:progress` pair.

use serde::{Deserialize, Serialize};
use specta::Type;
use specta_typescript::Number;
use tauri_specta::Event;

// `u64`/`i64` are BigInt-forbidden by specta's TS exporter; `#[specta(type =
// Number)]` emits plain JS `number` (floppy's counts stay well under 2^53).

/// Which side of a transfer an event belongs to. Serializes as "send"/"receive".
#[derive(Serialize, Deserialize, Debug, Clone, Copy, Type)]
#[serde(rename_all = "lowercase")]
pub enum TransferKind {
    Send,
    Receive,
}

/// The code/ticket to display for a send (emitted once, at the start).
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct CodeEvent {
    pub id: String,
    pub kind: TransferKind,
    pub code: String,
}

/// Byte/file progress for the active transfer.
#[derive(Serialize, Deserialize, Debug, Clone, Default, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub id: String,
    pub kind: TransferKind,
    // f64 would export as `number | null` (specta guards non-finite floats);
    // our values are always finite, so pin plain `number`.
    #[specta(type = Number)]
    pub percent: f64,
    pub file: String,
    #[specta(type = Number)]
    pub file_index: u64,
    #[specta(type = Number)]
    pub file_count: u64,
    #[specta(type = Number)]
    pub sent: u64,
    #[specta(type = Number)]
    pub total: u64,
    #[specta(type = Number)]
    pub bps: f64,
    #[specta(type = Number)]
    pub eta: i64,
}

/// Transfer finished. `dest` is the save path on a receive, empty on a send.
#[derive(Serialize, Deserialize, Debug, Clone, Default, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct DoneEvent {
    pub id: String,
    pub kind: TransferKind,
    pub dest: String,
}

/// Transfer failed. `message` is human text; `code` is machine-readable.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct ErrorEvent {
    pub id: String,
    pub kind: TransferKind,
    pub code: String,
    pub message: String,
}

/// A verified incoming trusted-device offer awaiting accept/decline.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct PairingOfferEvent {
    pub transfer_id: String,
    pub from_name: String,
    #[specta(type = Number)]
    pub file_count: u64,
    #[specta(type = Number)]
    pub total_bytes: u64,
}

/// The peer accepted a trusted-device offer.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
pub struct PairingAccepted;

/// The peer declined a trusted-device offer.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
pub struct PairingDeclined;

/// A one-sided pairing completed; `name` is the newly trusted device.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct PairingPaired {
    pub name: String,
}

/// A pairing/signalling error surfaced as a toast.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct PairingError {
    pub message: String,
}

// `Default` needs a variant to point at; nothing depends on which.
impl Default for TransferKind {
    fn default() -> Self {
        TransferKind::Send
    }
}
