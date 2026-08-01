// The error vocabulary every command returns. Exported to TypeScript by
// tauri-specta as a tagged union, so the frontend branches on `kind` instead of
// matching on prose (`errors.ts` used to regex the Display text, which quietly
// coupled every error message to the UI and broke whenever copy was reworded).
//
// The mid-transfer counterpart is `ErrorEvent.code` (transport::TransferErrorCode);
// between them, every failure that reaches the UI carries a machine-readable
// discriminant. Variants that describe a known situation carry no message: the
// user-facing sentence for them is UI copy and lives in the frontend. `Other`
// is for failures whose text is already the explanation.

use serde::Serialize;
use specta::Type;
use std::fmt;

use crate::transport::error::StartError;

/// A command failure, as the frontend sees it.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum CommandError {
    /// A transfer is already running; this device does one at a time.
    Busy,
    /// The previous transfer is still stopping. Retry shortly.
    Unwinding,
    /// Nothing was picked.
    NoFiles,
    /// The code or ticket is empty or malformed.
    BadCode,
    /// Anything without its own variant; `message` is already user-facing.
    Other { message: String },
}

impl CommandError {
    /// Wrap prose that is already written for the user.
    pub fn other(message: impl Into<String>) -> Self {
        Self::Other { message: message.into() }
    }
}

impl From<StartError> for CommandError {
    fn from(error: StartError) -> Self {
        match error {
            StartError::Busy => Self::Busy,
            StartError::Unwinding => Self::Unwinding,
            StartError::NoFiles => Self::NoFiles,
            StartError::BadCode => Self::BadCode,
        }
    }
}

/// Lets the pairing service's own prose errors flow through `?` unchanged.
impl From<String> for CommandError {
    fn from(message: String) -> Self {
        Self::other(message)
    }
}

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Busy => f.write_str("transfer already running"),
            Self::Unwinding => f.write_str("previous transfer still stopping"),
            Self::NoFiles => f.write_str("no files selected"),
            Self::BadCode => f.write_str("invalid code phrase"),
            Self::Other { message } => f.write_str(message),
        }
    }
}

impl std::error::Error for CommandError {}
