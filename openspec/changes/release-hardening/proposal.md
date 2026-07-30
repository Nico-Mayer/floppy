# Release hardening

## Why

`tauri-iroh-migration` brought the app to desktop feature-parity with the Go build, and it is exercised by an automated test suite (transport, quick share, pairing, one-sided pairing, Go broker). What remains before it can ship is the operational and cross-machine validation the test suite cannot cover on its own: a real deployed broker, a decided relay strategy, and a transfer proven between two physical machines.

## What Changes

- **Deploy the broker.** The `broker/` module ships both modes (`/ws` mailbox, `/fp` fingerprint) and has a Railway Dockerfile + `railway.json`. Deploy it, terminate TLS, and point the app's default broker URL at the `wss://` endpoint (currently a local `ws://127.0.0.1:8787` dev default).
- **Decide the relay strategy.** iroh's default relays are n0-operated. Choose n0 default vs a self-hosted iroh relay (mirroring the old self-hosted-croc-relay option) and document it, including how to configure `RelayConfig::Custom`.
- **Cross-machine E2E.** Prove quick-share and trusted-device transfers between two real machines over the deployed broker + chosen relay, including resume after an interrupt.
- **Archive superseded changes.** `transfer-complete-notifications` and `deep-link-receive` are implemented in `tauri-iroh-migration` slice 5; archive/close them. Archive `tauri-iroh-migration` itself once its specs are promoted.

## Capabilities

### New Capabilities

- `release-readiness`: the deployed rendezvous broker, the documented relay strategy, and the cross-machine transfer validation that gate a release.

## Impact

- Deploy target (Railway) + the app's default broker URL / build-time config.
- A short relay-strategy doc.
- OpenSpec archive of the two superseded changes and, eventually, `tauri-iroh-migration`.
- No core code change expected beyond the default broker URL (and a relay override if self-hosting).
