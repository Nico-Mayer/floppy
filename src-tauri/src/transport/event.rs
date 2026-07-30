// The transport core's own event vocabulary — deliberately independent of the
// Tauri/specta events in `crate::events`. The service layer translates these
// into frontend events; tests use a fake emitter and assert on these directly.
// This mirrors the old Go design (internal/transfer emits transfer.Event;
// internal/services translated it) and keeps the core free of any UI imports.

use crate::transport::error::TransferError;

/// Transfer direction. At most one live transfer per kind (see Manager).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Send,
    Receive,
}

impl Kind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Kind::Send => "send",
            Kind::Receive => "receive",
        }
    }
}

/// Progress snapshot. Field semantics match the old croc `Stats` so the UI
/// ports unchanged: `sent`/`total` are bytes, `bps` a smoothed rate, `eta`
/// seconds remaining (-1 while unknown), and `file`/`file_index`/`file_count`
/// describe the file currently moving.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Stats {
    pub percent: f64,
    pub sent: u64,
    pub total: u64,
    pub bps: f64,
    pub eta: i64,
    pub file: String,
    pub file_index: u64,
    pub file_count: u64,
}

/// Everything the transport tells the outside world about one transfer. `id`
/// ties events to the transfer that produced them: with cancel-and-retry a
/// stale event could otherwise be attributed to the wrong transfer.
#[derive(Debug, Clone)]
pub enum Event {
    /// A send is now waiting for its peer; `code` is the ticket to display.
    Code { id: String, kind: Kind, code: String },
    /// Progress update. For a receiver the first one doubles as the manifest.
    Progress { id: String, kind: Kind, stats: Stats },
    /// Terminal success. `dest` is the save path on a receive, empty on a send.
    Done { id: String, kind: Kind, dest: String },
    /// Terminal failure. A *cancelled* transfer emits no event at all —
    /// cancellation is something the caller did, not something that happened.
    Failed { id: String, kind: Kind, error: TransferError },
}

/// Sink for transport events. Called from transfer tasks, so it must be
/// `Send + Sync` and must not block for long or call back into the Manager.
pub trait Emitter: Send + Sync + 'static {
    fn emit(&self, event: Event);
}

impl<F> Emitter for F
where
    F: Fn(Event) + Send + Sync + 'static,
{
    fn emit(&self, event: Event) {
        self(event)
    }
}
