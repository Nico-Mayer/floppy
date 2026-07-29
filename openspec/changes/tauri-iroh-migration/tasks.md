# Tasks: tauri-iroh-migration

Applied incrementally on a long-lived rewrite branch. Slices are ordered so each is demoable on its own. Slice 1 is done by the author (scaffolding).

## 1. Scaffold (author)

- [ ] 1.1 New branch; `create-tauri-app` with the Rust + SvelteKit template
- [ ] 1.2 SvelteKit configured as static SPA (static adapter, SPA fallback), served by Tauri
- [ ] 1.3 Re-add shadcn-svelte setup (`components.json`) and re-add existing UI components + transfer UI to the SvelteKit tree
- [ ] 1.4 Rust core skeleton: stub `send`/`receive`/`cancel`/`pair`/`quick_share` commands and a `croc:*` event emitter helper; frontend `invoke`/`listen` wrapper replacing the Wails bindings glue
- [ ] 1.5 Confirm the app launches, window opens, a stub command round-trips

## 2. Transport MVP (transport-iroh)

- [ ] 2.1 Add `iroh` + `iroh-blobs`; construct and hold an iroh node in the core
- [ ] 2.2 Send: import selected paths as a blob/collection, produce a ticket, emit `croc:code` with the ticket
- [ ] 2.3 Receive: accept a ticket, fetch, export to a chosen destination, emit `croc:received`
- [ ] 2.4 Progress: subscribe to iroh-blobs progress stream → emit `croc:send:progress` / `croc:recv:progress` (done/total, current file/index/count); guarantee a final 100% before the done event, done event last
- [ ] 2.5 Cancel: abort the transfer task promptly, emit no terminal event
- [ ] 2.6 Concurrency guard: one send + one receive max; stable busy error to the frontend
- [ ] 2.7 Relay config: default relay + override + disable-local, injectable for tests
- [ ] 2.8 Tests: two in-process iroh nodes over a local relay — send/receive, progress ordering, cancel emits nothing, resume reuses partial data, busy rejection. No data-race fence needed.

## 3. Quick share (code-phrase-share + rendezvous-broker)

- [ ] 3.1 Code phrase: generate/normalize (`digits-word-word`, whitespace→hyphens); word list (bip39-style or croc-derived)
- [ ] 3.2 Broker (Go): add code-mailbox mode — relay opaque handshake blobs between two parties in a code-derived room; leave fingerprint mode untouched; tests for pairing + isolation
- [ ] 3.3 Rust broker client: connect, join mailbox room, exchange opaque messages (`tokio-tungstenite`)
- [ ] 3.4 SPAKE2 handshake (`spake2`): room from leading segment(s), full normalized code as password; derive key K
- [ ] 3.5 Exchange iroh ticket encrypted under K (`hkdf` + `chacha20poly1305`); **bind sender NodeId into the transcript/payload**; receiver pins the dialed NodeId
- [ ] 3.6 Wire quick-share send/receive commands end-to-end onto the transport; no trust-store writes
- [ ] 3.7 Tests: matching codes complete + decrypt ticket; wrong code fails, no ticket revealed; swapped NodeId rejected; quick share leaves trust store unchanged

## 4. Trusted devices (device-pairing)

- [ ] 4.1 Port `internal/pairing/` to Rust (`ed25519-dalek`, `x25519-dalek`, `sha2`): identity load/create (atomic write, 0600), fingerprint, encode/decode, trust store, ECDH, SAS — preserve wire contract; port tests
- [ ] 4.2 Offer/response: sign/verify; offer carries sender NodeId; verification rejects untrusted / bad-signature / tampered-NodeId; receiver dials only the verified NodeId
- [ ] 4.3 Delete the croc-code HKDF derivation (removed requirement); trusted transfer bootstraps from the signed offer's ticket/NodeId
- [ ] 4.4 Signal flow over the broker fingerprint mode → hand the ticket to the transport
- [ ] 4.5 Tests: signed offer round-trip with NodeId binding; substituted-node rejection; full trusted send/receive over a local broker + local iroh relay

## 5. Plugins & platform polish (app-shell-tauri)

- [ ] 5.1 `tauri-plugin-notification`: completion notification only when window unfocused; send/receive titles; click opens dest (supersedes `transfer-complete-notifications`)
- [ ] 5.2 `tauri-plugin-deep-link`: register scheme, deliver code to core → initiate receive (supersedes `deep-link-receive`)
- [ ] 5.3 `tauri-plugin-dialog` file picker + Tauri drag-drop events (replaces `EnableFileDrop` + `FileService` picker)
- [ ] 5.4 `tauri-plugin-opener` for open-folder (replaces `FileService.OpenPath`)
- [ ] 5.5 Previews: `/localfile`-equivalent route backed by the Rust `image` crate; downscale supported formats, stream the rest; ETag/max-age/size-gate parity
- [ ] 5.6 Drop the `stdio.SilenceUnusableStderr` hack (not needed on Tauri)

## 6. Mobile (app-shell-tauri)

- [ ] 6.1 iOS target: build, run, transfer end-to-end (iroh on iOS)
- [ ] 6.2 Android target: build, run, transfer end-to-end (iroh on Android)
- [ ] 6.3 Mobile picker returns a readable path/sandbox copy; previews run on the copy
- [ ] 6.4 Lower preview memory budgets for phones (`thumbMaxSourcePixels`, decode concurrency)

## 7. Verification

- [ ] 7.1 `cargo test` green (transport, pairing, quick-share); Go broker tests green
- [ ] 7.2 Frontend builds as static SPA and runs in the Tauri webview; transfer UI works against the real core
- [ ] 7.3 Manual E2E: quick-share and trusted-device transfer across two real machines; resume after interrupt
- [ ] 7.4 Decide relay strategy (n0 default vs self-hosted iroh relay) and document it
- [ ] 7.5 Archive/close the superseded `transfer-complete-notifications` and `deep-link-receive` changes
