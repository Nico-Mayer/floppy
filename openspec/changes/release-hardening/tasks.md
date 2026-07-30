# Tasks: release-hardening

Moved from `tauri-iroh-migration` slice 7. The automated suite (7.1) is already
green there; this change covers the operational + cross-machine gates.

## 1. Deploy & document

- [ ] 1.1 Deploy the broker (Railway, `broker/Dockerfile` + `railway.json`); confirm `wss://` serves `/ws` + `/fp` + `/health`
- [ ] 1.2 Point the app's default broker URL at the deployed endpoint (currently `ws://127.0.0.1:8787`); keep `FLOPPY_BROKER_URL` override
- [ ] 1.3 Decide relay strategy (n0 default vs self-hosted iroh relay) and document it, incl. `RelayConfig::Custom` usage

## 2. Validate & close

- [ ] 2.1 Manual E2E: quick-share and trusted-device transfer across two real machines; resume after interrupt
- [x] 2.2 Close the superseded `transfer-complete-notifications` and `deep-link-receive` changes — deleted 2026-07-30 (their behaviour ships in `tauri-iroh-migration` slices 5.1/5.2 and is specified in `specs/app-shell-tauri/spec.md`)
- [ ] 2.3 Promote `tauri-iroh-migration` specs and archive it
