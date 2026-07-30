// Quick-share rendezvous: turn a human code phrase into an authenticated iroh
// ticket exchange over the broker's code-mailbox, with no device trust added.
//
// - `code`    — generate/normalize the phrase, derive the mailbox room.
// - `pake`    — SPAKE2 over the code + AEAD-sealed ticket (the security core).
// - `client`  — the WebSocket mailbox client (talks to the Go broker).

pub mod client;
pub mod code;
pub mod pake;
