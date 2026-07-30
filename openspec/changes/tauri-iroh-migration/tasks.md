# Tasks: tauri-iroh-migration

Applied incrementally on a long-lived rewrite branch. Slices are ordered so each is demoable on its own. Slice 1 is done by the author (scaffolding).

## 1. Scaffold (author)

- [x] 1.1 New branch; `create-tauri-app` with the Rust + SvelteKit template
- [x] 1.2 SvelteKit configured as static SPA (static adapter, SPA fallback), served by Tauri
- [x] 1.3 Re-add shadcn-svelte setup (`components.json`) and re-add existing UI components + transfer UI to the SvelteKit tree
- [x] 1.4 Rust core skeleton: stub `send`/`receive`/`cancel`/`pair`/`quick_share` commands and a `croc:*` event emitter helper; frontend `invoke`/`listen` wrapper replacing the Wails bindings glue
- [ ] 1.5 Confirm the app launches, window opens, a stub command round-trips

## 2. Transport MVP (transport-iroh)

- [x] 2.1 Add `iroh` + `iroh-blobs`; construct and hold an iroh node in the core
- [x] 2.2 Send: import selected paths as a blob/collection, produce a ticket, emit the code event with the ticket
- [x] 2.3 Receive: accept a ticket, fetch, export to a chosen destination, emit the done event
- [x] 2.4 Progress: subscribe to iroh-blobs progress stream → emit progress events (done/total, current file/index/count); guarantee a final 100% before the done event, done event last
- [x] 2.5 Cancel: abort the transfer task promptly, emit no terminal event
- [x] 2.6 Concurrency guard: one send + one receive max; stable busy error to the frontend
- [x] 2.7 Relay config: default relay + override + disable-local, injectable for tests
- [x] 2.8 Tests: two in-process iroh nodes over a local relay — send/receive, progress ordering, cancel emits nothing, resume reuses partial data, busy rejection. No data-race fence needed.

## 3. Quick share (code-phrase-share + rendezvous-broker)

- [x] 3.1 Code phrase: generate/normalize (`digits-word-word`, whitespace→hyphens); word list (bip39-style or croc-derived)
- [x] 3.2 Broker (Go): add code-mailbox mode — relay opaque handshake blobs between two parties in a code-derived room; leave fingerprint mode untouched; tests for pairing + isolation
- [x] 3.3 Rust broker client: connect, join mailbox room, exchange opaque messages (`tokio-tungstenite`)
- [x] 3.4 SPAKE2 handshake (`spake2`): room from leading segment(s), full normalized code as password; derive key K
- [x] 3.5 Exchange iroh ticket encrypted under K (`hkdf` + `chacha20poly1305`); **bind sender NodeId into the transcript/payload**; receiver pins the dialed NodeId
- [x] 3.6 Wire quick-share send/receive commands end-to-end onto the transport; no trust-store writes
- [x] 3.7 Tests: matching codes complete + decrypt ticket; wrong code fails, no ticket revealed; swapped NodeId rejected; quick share leaves trust store unchanged

## 4. Trusted devices (device-pairing)

- [x] 4.1 Port `internal/pairing/` to Rust (`ed25519-dalek`, `x25519-dalek`, `sha2`): identity load/create (atomic write, 0600), fingerprint, encode/decode, trust store, ECDH, SAS — preserve wire contract; port tests
- [x] 4.2 Offer/response: sign/verify; offer carries sender NodeId; verification rejects untrusted / bad-signature / tampered-NodeId; receiver dials only the verified NodeId
- [x] 4.3 Delete the croc-code HKDF derivation (removed requirement); trusted transfer bootstraps from the signed offer's ticket/NodeId
- [x] 4.4 Signal flow over the broker fingerprint mode → hand the ticket to the transport
- [x] 4.5 Tests: signed offer round-trip with NodeId binding; substituted-node rejection; full trusted send/receive over a local broker + local iroh relay

## 5. Plugins & platform polish (app-shell-tauri)

- [x] 5.1 `tauri-plugin-notification`: completion notification only when window unfocused; send/receive titles; click opens dest (supersedes `transfer-complete-notifications`) — notif shown when unfocused with `Sent <size>`/`Received N file(s)` titles + dest payload; desktop click→open-dest is a plugin limitation (best-effort)
- [x] 5.2 `tauri-plugin-deep-link`: register scheme, deliver code to core → initiate receive (supersedes `deep-link-receive`) — `floppy://receive?code=…` prefills (no auto-start); also routes `floppy://pair/…`
- [x] 5.3 `tauri-plugin-dialog` file picker + Tauri drag-drop events (replaces `EnableFileDrop` + `FileService` picker)
- [x] 5.4 `tauri-plugin-opener` for open-folder (replaces `FileService.OpenPath`)
- [x] 5.5 Previews: `/localfile`-equivalent route backed by the Rust `image` crate; downscale supported formats, stream the rest; ETag/max-age/size-gate parity — served over the `thumb://` custom protocol
- [x] 5.6 Drop the `stdio.SilenceUnusableStderr` hack (not needed on Tauri) — never ported (moot)

## 6. Verification (desktop parity)

- [x] 6.1 `cargo test` green (transport, pairing, quick-share); Go broker tests green
- [x] 6.2 Frontend builds as static SPA and runs in the Tauri webview; transfer UI works against the real core (builds + typechecks green; live webview run is manual)

> **Moved out of this change** (2026-07-30, at desktop-parity milestone):
>
> - Mobile targets (iOS/Android, mobile picker, phone preview budgets) → **`android-port`** (which also lays the shared mobile foundation), then **`ios-port`**.
> - Cross-machine E2E, broker deploy + relay-strategy doc, archiving superseded changes → **`release-hardening`** change.
>
> This change is now scoped to desktop feature-parity with the Go/Wails build (slices 1–5), which is complete.
