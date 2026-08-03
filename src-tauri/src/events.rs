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

use crate::health::{Link, Snapshot};
use crate::transport::error::TransferErrorCode;

// `u64`/`i64` are BigInt-forbidden by specta's TS exporter; `#[specta(type =
// Number)]` emits plain JS `number` (floppy's counts stay well under 2^53).

/// Which side of a transfer an event belongs to. Serializes as "send"/"receive".
#[derive(Serialize, Deserialize, Debug, Clone, Copy, Default, Type)]
#[serde(rename_all = "lowercase")]
pub enum TransferKind {
    #[default]
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

/// Transfer failed. `code` is the machine-readable class the UI branches on;
/// `message` is the sentence to show when there is nothing better to say.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct ErrorEvent {
    pub id: String,
    pub kind: TransferKind,
    pub code: TransferErrorCode,
    pub message: String,
}

/// Connectivity health changed: the state of the two links a transfer depends on.
/// Not a transfer event — it belongs to no transfer, so it carries no `id` and no
/// `kind`. The payload is always both links rather than the one that moved, so a
/// dropped event cannot leave the frontend holding a mixture of old and new. The
/// `health` command returns this same shape for a screen that opens mid-session.
#[derive(Serialize, Deserialize, Debug, Clone, Copy, Default, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct HealthEvent {
    pub relay: Link,
    pub broker: Link,
}

impl From<Snapshot> for HealthEvent {
    fn from(s: Snapshot) -> Self {
        HealthEvent { relay: s.relay, broker: s.broker }
    }
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

/// The peer declined a trusted-device offer. `busy` is true when it was an
/// automatic busy-decline (they were mid-transfer), false for a deliberate "no".
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct PairingDeclined {
    pub busy: bool,
}

/// The peer cancelled a trusted-device offer this device had not answered yet;
/// the incoming prompt for it should be dismissed.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct PairingRevoked {
    pub transfer_id: String,
}

/// A device redeemed a code this device is showing and awaits confirmation
/// before it is trusted. `sas` is the short auth string to compare; `via` is how
/// the peer redeemed ("qr" | "code") — the UI shows the SAS only for "code".
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct PairingRequest {
    pub fingerprint: String,
    pub suggested_name: String,
    pub sas: String,
    pub via: String,
}

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

/// Which flow a `floppy://` link carries a code for. Serializes as
/// "receive"/"pair".
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, Type)]
#[serde(rename_all = "lowercase")]
pub enum DeepLinkKind {
    Receive,
    Pair,
}

/// A `floppy://` deep link opened the app, carrying a code for one of the two
/// flows that use one. Neither kind is acted on by arriving: the code is filled
/// in and a person presses.
#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
pub struct DeepLink {
    pub kind: DeepLinkKind,
    pub code: String,
}
