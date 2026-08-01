// Transfer error taxonomy. Two audiences:
//
//   - `StartError` is returned when a transfer refuses to start. The command
//     layer maps it to `CommandError` (see `crate::error`), which the frontend
//     branches on by variant — the `Display` text is for logs, not the UI.
//   - `TransferError` is a failure mid-transfer, emitted as an `ErrorEvent`
//     carrying a `TransferErrorCode` and a user-facing `message`.
//
// floppy owns every message; they are written to be actionable rather than to
// echo a transport library's wording.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::fmt;

/// Errors returned synchronously when starting or cancelling a transfer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StartError {
    /// A transfer is already running (send or receive — the device runs one at a
    /// time) and was not cancelled.
    Busy,
    /// The previous transfer was cancelled but has not finished stopping within
    /// the grace period. Retry shortly.
    Unwinding,
    /// `send` was called with an empty path list.
    NoFiles,
    /// The ticket/code is empty or malformed.
    BadCode,
}

impl fmt::Display for StartError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let msg = match self {
            StartError::Busy => "transfer already running",
            StartError::Unwinding => "previous transfer still stopping",
            StartError::NoFiles => "no files selected",
            StartError::BadCode => "invalid code phrase",
        };
        f.write_str(msg)
    }
}

impl std::error::Error for StartError {}

/// A mid-transfer failure, classified for the UI. `code` is a stable slug the
/// frontend can branch on; `message` is the sentence shown to the user.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransferError {
    pub code: TransferErrorCode,
    pub message: String,
}

/// Machine-readable classification of a runtime transfer failure. Some variants
/// are situational (a bad ticket is caught earlier as a `StartError`); the enum
/// is kept complete as the classification contract.
///
/// Derives `Type` so `ErrorEvent.code` exports as a TypeScript union rather than
/// a bare `string` the frontend has to know the spellings of. specta is a
/// serialization concern, not a Tauri one, so this stays consistent with the
/// core's no-Tauri-imports rule — and it means the taxonomy cannot drift from
/// the copy of it the frontend branches on, because there is no copy.
#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum TransferErrorCode {
    /// Could not reach the peer or relay to establish a connection.
    Connect,
    /// The connection was established but dropped mid-transfer.
    Disconnected,
    /// Connecting/handshake took too long.
    Timeout,
    /// The ticket could not be parsed.
    BadTicket,
    /// Writing received data to disk failed (permissions, disk full).
    Storage,
    /// Anything not otherwise classified. `message` carries the raw detail.
    Other,
}

impl TransferErrorCode {
    /// The wire spelling, for `Display` and logs. Must match what serde emits;
    /// `slug_matches_serde` below holds the two together.
    pub fn slug(&self) -> &'static str {
        match self {
            TransferErrorCode::Connect => "connect",
            TransferErrorCode::Disconnected => "disconnected",
            TransferErrorCode::Timeout => "timeout",
            TransferErrorCode::BadTicket => "bad_ticket",
            TransferErrorCode::Storage => "storage",
            TransferErrorCode::Other => "other",
        }
    }

    /// A default user-facing sentence for this class. Callers may override with
    /// something more specific when they have detail worth showing.
    pub fn default_message(&self) -> &'static str {
        match self {
            TransferErrorCode::Connect => {
                "Could not reach the other device. Check your internet, then try again."
            }
            TransferErrorCode::Disconnected => {
                "The connection broke. Whatever arrived is saved, so you can pick up where it stopped."
            }
            TransferErrorCode::Timeout => {
                "The other device never answered. It might be offline, or the code might be wrong."
            }
            TransferErrorCode::BadTicket => "That code does not work. Check it and try again.",
            TransferErrorCode::Storage => {
                "Could not save the files. Check that the folder has room and that Floppy is allowed to write to it."
            }
            TransferErrorCode::Other => "That did not work.",
        }
    }
}

impl TransferError {
    pub fn new(code: TransferErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into() }
    }

    /// Build from a class using its default message.
    pub fn of(code: TransferErrorCode) -> Self {
        Self { code, message: code.default_message().into() }
    }
}

impl fmt::Display for TransferError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code.slug(), self.message)
    }
}

impl std::error::Error for TransferError {}

#[cfg(test)]
mod tests {
    use super::*;

    /// `slug()` is what logs and `Display` use; serde is what the frontend
    /// branches on. They have to agree, so assert it rather than hope.
    #[test]
    fn slug_matches_serde() {
        for code in [
            TransferErrorCode::Connect,
            TransferErrorCode::Disconnected,
            TransferErrorCode::Timeout,
            TransferErrorCode::BadTicket,
            TransferErrorCode::Storage,
            TransferErrorCode::Other,
        ] {
            let wire = serde_json::to_string(&code).unwrap();
            assert_eq!(wire, format!("\"{}\"", code.slug()));
        }
    }
}
