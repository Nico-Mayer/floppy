# Tasks: pairing-confirm-and-name

## 1. Backend — confirm gate

- [x] 1.1 `trust.rs`: add `rename(fingerprint, name)` (persisted like add/remove)
- [x] 1.2 `service.rs`: add `PairingEvent::Request { fingerprint, suggested_name }`; on seal, hold the peer identity in a `pending_pairs` map and emit `Request` instead of trusting
- [x] 1.3 `service.rs`: `confirm_pair(fingerprint, name)` (move pending → trust, emit Paired) and `dismiss_pair(fingerprint)` (drop pending)
- [x] 1.4 `service.rs`: `rename_device(fingerprint, name)` delegating to trust store
- [x] 1.5 Update the one-sided pairing test: initiator emits `Request`, trust becomes mutual only after `confirm_pair`

## 2. IPC surface

- [x] 2.1 `lib.rs`: `PairingRequest` event + `confirm_pair` / `dismiss_pair` / `rename_device` commands wired into `specta_builder`; regenerate `bindings.ts`

## 3. Frontend

- [x] 3.1 `pairing-app.svelte.ts`: hold an incoming pair request; `confirmPair(name)` / `dismissPair()` / `rename(fp, name)`
- [x] 3.2 A confirm-and-name dialog on the initiator (name prefilled from the suggestion)
- [x] 3.3 `DevicesView.svelte`: inline rename of a trusted device
