# Tasks: trusted-devices

> **Scope: desktop-first slice only.** These tasks take the feature to a first working
> end-to-end test on the desktop build — pairing + codeless push-to-accept, app assumed
> open, a dumb local broker, no APNs/FCM, no mobile. The mobile / wake-from-closed / push
> phases and the R1 receive-dest rework stay in `design.md` (phases P3–P4) and are out of
> scope here. Ordering front-loads the risky integration by **stubbing real pairing** (section 4)
> until the codeless path (sections 2–3) works end-to-end.

## 1. Pairing core — `internal/pairing/` (pure Go, no croc, no Wails, no network)

- [x] 1.1 New package `internal/pairing`: `Identity{PublicKey, privateKey}` with keypair generation; `LoadOrCreate(dir string) (*Identity, error)` persisting the private key to `dir` (0600), generating on first run. `dir` is injectable so two instances can run side by side.
- [x] 1.2 `TrustStore`: JSON-file-backed `{PublicKey, Name}` set under the identity dir — `Add`, `Remove`, `List`, `Get(pk)`, `Trusted(pk) bool`. Concurrency-safe (mutex); atomic write (temp + rename).
- [x] 1.3 `SharedSecret(peerPub)` via ECDH over the identity keys; `DeriveCode(secret []byte, transferId string) string` = HKDF → a croc-shaped code. **Spread the first 4 chars** (relay room) so derived codes don't collide (design.md R7) — e.g. prefix with a numeric block like croc's random names.
- [x] 1.4 `Offer{From, TransferID, TS, FileCount, TotalBytes}` with `Sign(id)` / `Verify(offer, trust)` — verify rejects offers whose `From` is not in the trust store or whose signature fails.
- [x] 1.5 `SAS(secret) string` — short-authentication-string (e.g. 5–6 digits) derived from the pairing secret, identical on both sides for the compare step.
- [x] 1.6 `internal/pairing/*_test.go`: table tests — keypair round-trip + persistence; trust add/remove/list; two identities derive the **same** SharedSecret and SAS; DeriveCode determinism + distinct 4-char prefixes across transferIds; Sign/Verify accept-good / reject-untrusted / reject-tampered. Gate: `go test -race ./internal/pairing/` green, zero deps.

## 2. Minimal broker — dumb WS relay (no push, no accounts, no DB)

- [x] 2.1 New `internal/broker/` (server logic, importable so tests run it in-process) + `cmd/broker/main.go` (thin `main` that serves it). WebSocket endpoint.
- [x] 2.2 `register{pubkey, sig}` — verify the signature is by `pubkey`, hold the live socket keyed by `pubkey`; drop the mapping on disconnect.
- [x] 2.3 `offer{to, blob}` — forward `blob` verbatim over the target's live socket; if the target is offline, reply `unreachable` (desktop = both open; push is a future phase). Broker never parses the offer beyond routing.
- [x] 2.4 `internal/broker/*_test.go`: in-process broker (mirrors the in-process croc-relay test pattern) — register two clients, offer A→B arrives at B byte-identical; offer to an unregistered pk → `unreachable`; bad register signature rejected. `go test -race` green, no network.

## 3. Client wiring — codeless send end-to-end (trust STUBBED)

- [x] 3.1 Broker client behind an interface (`type Rendezvous interface { Register(...); SendOffer(...); Offers() <-chan Offer }`) — a seam like `peerFactory`, so `PairingService` tests fake it with no WS.
- [x] 3.2 New `internal/services/pairingservice.go` (`PairingService`, Wails adapter): on startup load `Identity` (`--identity-dir`/env override), open the broker WS, register own pubkey.
- [x] 3.3 `SendTo(peerPub, paths)`: build + sign an `Offer`, send via the rendezvous. Track the pending outbound transfer by `TransferID`.
- [x] 3.4 Incoming offer: `Verify` against the trust store; on pass raise an **interactive** OS notification "`<name>` — N files (size) [Accept] [Decline]" — reuse the notifications service from `transfer-complete-notifications` (extend it with action buttons / response routing).
- [x] 3.5 Accept → `DeriveCode(SharedSecret(peerPub), transferId)` → call the **existing** `transfer.Manager.Receive(code)`; the sender side (offer acknowledged / a symmetric ready-signal over the broker) derives the same code and calls `Manager.Send(code, paths)`. Decline → emit `pairing:declined`; sender surfaces it. **`internal/transfer` is not modified.**
- [x] 3.6 Register `pairing:*` events + payload types in `RegisterEvents` (`pairing:offer`, `pairing:accepted`, `pairing:declined`, `pairing:error`) — same generated-payload discipline as the `croc:*` events.
- [x] 3.7 Dev seam to STUB pairing: `--seed-trust <pubkey>[,name]` (or env) writes a peer into the trust store at startup, so two instances "already trust each other" without any pairing UI. Lets sections 2–3 be tested before section 4 exists.
- [x] 3.8 `internal/services/pairingservice_test.go`: fake rendezvous — SendTo signs + emits an offer; incoming trusted offer → notification raised + (on accept) `Manager.Receive` called with the derived code; untrusted offer → no notification; decline → `pairing:declined`, no receive; derived code equals the sender's. `go test -race` green.

## 4. Real pairing UI (after the section 3 e2e test passes)

- [x] 4.1 Frontend "Devices" panel: show own identity as QR + copyable text (reuse the existing `spell/qrcode` component the send panel uses).
- [x] 4.2 Add a trusted device: scan/paste the peer's identity blob → run the SAS compare (both screens show the same digits, user confirms "matches" on both) → on confirm, `TrustStore.Add`. Reject on mismatch.
- [x] 4.3 List trusted devices with a remove/un-trust action (`TrustStore.Remove`); removing is the desktop stand-in for revocation (design.md open question #6).
- [x] 4.4 Replace the `--seed-trust` stub path with real pairing as the primary way to populate the trust store (keep the flag as a dev-only shortcut).

## 5. Verification — first desktop end-to-end test

- [x] 5.1 `go test -race ./...` green — no OS notifications, no network, no real broker/croc-relay in unit tests (broker + rendezvous faked / in-process).
- [x] 5.2 Manual, two dev instances, different `--identity-dir`, one local broker (`cmd/broker` on localhost), trust seeded via `--seed-trust`: instance A clicks "Bob" → instance B raises "Alice — 3 files [Accept][Decline]".
- [x] 5.3 Decline path: B declines → nothing written on B, A shows "declined".
- [x] 5.4 Accept path: B accepts → derived code matches both sides (log-check), the croc transfer runs via the existing `Manager`, files land in B's dest, **no code typed anywhere**.
- [x] 5.5 Real pairing path (after section 4): pair two fresh instances via QR/paste + SAS with no seeding, then repeat 5.4 — first fully self-contained trusted-device transfer on desktop.
