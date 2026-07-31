# Tauri + iroh Migration

## Why

Wails 3 mobile is alpha and experimental; shipping floppy to iOS/Android on it is a fight (the repo already carries hand-rolled `build/android` and `build/ios` scripts). Tauri 2 has first-class, stable mobile since Oct 2024. Mobile is now the priority.

The move to a Rust core forces dropping croc (a Go library that cannot run in-process from Rust). That is an opportunity, not just a cost: adopting **iroh** + `iroh-blobs` replaces croc's no-progress-API polling race, its CWD-parking dance, and its folder-based resume with a QUIC hole-punching transport that has native progress streams and BLAKE3 content-addressed resume — and it is built for mobile. croc↔floppy-CLI interop is explicitly **not** a feature we need to preserve.

One transport now serves both flows floppy wants: adding a trusted device (key-based) and quick one-off sharing with a human code phrase (no device added).

## What Changes

- **BREAKING**: Replace the Wails 3 shell with **Tauri 2**; the Go backend is rewritten in Rust. croc is removed entirely.
- **BREAKING**: Frontend moves from Vite + Svelte to **SvelteKit** (static adapter, SPA). All existing shadcn-svelte components and the transfer UI are re-added to the SvelteKit tree; Wails bindings + `Events.On('croc:*')` glue is rewired to Tauri `invoke()` + `listen()`.
- Transfer transport becomes **iroh + iroh-blobs**: QUIC, hole-punching, relay fallback, BLAKE3-verified streaming with resume-by-hash.
- **Unified rendezvous**: both transfer flows exchange an iroh ticket, then transfer over iroh. They differ only in how the ticket exchange is authenticated:
  - **Trusted device** — routed by fingerprint over the existing broker contract; ticket signed with the device's Ed25519 identity (no PAKE, keys pre-trusted).
  - **Quick share** — a human code phrase (number + words) drives a **SPAKE2** PAKE over a broker mailbox; the iroh ticket is exchanged encrypted under the PAKE-derived key. No device is added or stored.
- The sender's iroh **NodeId is bound into the exchange** (signed offer, or PAKE transcript) so a dumb rendezvous cannot MITM by swapping in its own node.
- The **broker stays Go** as a standalone relay process; it grows a second **code-mailbox mode** alongside the existing fingerprint-routing mode. Only the client side moves into the Rust core.
- Off-the-shelf Tauri plugins absorb custom work: `tauri-plugin-notification` (supersedes the `transfer-complete-notifications` change), `tauri-plugin-deep-link` (supersedes `deep-link-receive`), `tauri-plugin-dialog` (mobile-capable file picker), `tauri-plugin-fs`/`tauri-plugin-opener`.
- Previews move to the Rust `image` crate behind the same asset route; the mobile picker's sandbox-copy behavior resolves the content:// / security-scoped-URL problem `preview.go` documented as unsolved.
- Target **iOS + Android** builds in addition to macOS/Windows/Linux.

## Capabilities

### New Capabilities

- `app-shell-tauri`: the Tauri 2 + SvelteKit application shell — command/event bridge, asset serving, window + mobile targets, and the plugin set that replaces bespoke Go/Wails services.
- `transport-iroh`: the iroh + iroh-blobs transfer core — send/receive, progress, cancel, and resume — exposed to the frontend through the same event vocabulary the UI already speaks.
- `code-phrase-share`: quick one-off sharing via a human code phrase over a PAKE'd broker mailbox, resolving to an iroh ticket, with no device trust added.

### Modified Capabilities

- The trusted-device pairing capability (identity, offers, signals, broker routing) is re-implemented in Rust with equivalent behavior; its wire contract (fingerprints, signed offers, broker message envelope) is preserved so the Go broker keeps serving it.

## Impact

- **Supersedes** the `transfer-complete-notifications` and `deep-link-receive` changes — both become Tauri plugin wiring on the new shell rather than Wails work. Archive or fold them once this lands.
- New Rust crate dependencies: `iroh`, `iroh-blobs`, `ed25519-dalek`, `x25519-dalek`, `sha2`, `spake2`, `chacha20poly1305`, `hkdf`, `tokio`, `tokio-tungstenite`, `serde`/`serde_json`, `image`, `tauri` + plugins.
- The careful croc test harness (in-process relay, croctool peer process, `Snapshot()` race fence, `skipIfRace`, race_on/race_off split) is **retired** — iroh's progress API removes the data race it existed to manage. New tests exercise iroh transfers between two in-process nodes over a local relay.
- Frontend contract is preserved where cheap: the `croc:*` event names and payload shapes (`id`, `kind`, progress/done/error) are kept as the Tauri event vocabulary so the UI logic ports with minimal churn, even though the transport underneath is new.
- The Go broker binary and its wire contract are unchanged for the fingerprint path; the code-mailbox mode is additive.
- This is a long-lived rewrite branch. This change captures the target; it is applied incrementally (see design.md migration slices), not in one commit.
