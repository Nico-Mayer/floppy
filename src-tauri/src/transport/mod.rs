// The file-transfer core: iroh + iroh-blobs over QUIC, one live send and one
// live receive at a time, reporting through an injected `Emitter`. Deliberately
// free of any Tauri/UI imports so it can be unit-tested with in-process iroh
// nodes over a local relay (see the tests module once the Manager lands).
//
// Slice 2 builds this out: `error`/`event`/`progress` are the transport-agnostic
// primitives; the `Manager` (node lifecycle, send/receive, cancel, concurrency)
// is added on top.

pub mod error;
pub mod event;
pub mod manager;
pub mod progress;

pub use event::{Emitter, Event, Kind};
pub use manager::{Config, Manager, Publish, RelayConfig};
