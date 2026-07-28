# Trusted devices — codeless push-to-accept transfers

> **Status: exploration only.** Feasibility explored 2026-07-28; no implementation is
> scheduled. This change preserves the findings (see `design.md`). Mobile-first is a
> deliberate framing decision, not a shipped capability.

## Why

Sending to someone you transfer with often still costs a full code exchange every time:
sender generates a phrase, gets it to the receiver out-of-band, receiver types it in. For a
recurring pair of devices that is pure friction. If two devices verify each other **once**,
later transfers should need no code at all — the sender picks a device, the receiver gets a
notification, taps **Accept**, and the files land. No accounts, no login, no passphrase after
the first pairing.

This is the Syncthing / Magic-Wormhole / Signal device-identity model layered on top of the
existing croc transport: identity lives in a per-device keypair, trust is established once via
an in-person pairing step, and every later transfer derives its croc code automatically from
the pairing.

## What Changes

- **Device identity**: each install generates a long-lived keypair on first run, persisted
  (desktop file / mobile keychain). Device identity = its public key fingerprint. No server
  account anywhere.
- **Pairing (one time, out-of-band)**: QR scan + short-authentication-string (SAS) compare to
  exchange and confirm public keys with MITM protection. Result stored in a local trust store
  (`{pubkey, display name}` per trusted device).
- **Codeless send**: to send to a trusted device the sender signs an *offer*
  (`{from, transferId, ts}`), the receiver is woken, and — on accept — both derive the same
  croc code via `HKDF(shared_secret, transferId)`. The existing `transfer.Manager` runs the
  transfer unchanged.
- **Always prompt, never auto-accept**: an incoming offer always raises an interactive
  notification (`Accept` / `Decline`). No file is written before an explicit accept. After
  accept, no passphrase or code entry — the transfer starts directly.
- **Wake-from-closed (mobile only)**: a closed mobile app is woken by an **alert push with
  action buttons** (APNs / FCM). The transfer itself only runs after Accept brings the app to
  the foreground — no background execution / silent push / background croc required. Desktop
  assumes the app is open (persistent connection or LAN presence).
- **Signaling / push broker (new service)**: a dumb, login-less broker routes signed offers to
  a target device and triggers its push. Auth is a device-key signature, not an account.

## Capabilities

### New Capabilities

- `trusted-devices` — pair two devices once (QR + SAS), then send between them with no code:
  an interactive Accept/Decline notification on the receiver, and an automatically derived
  croc code on accept.

### Modified Capabilities

<!-- none — existing send/receive specs are unchanged; trusted-device send is an additional
     path that produces a code and calls the existing Manager. -->

## Impact

- **New `internal/pairing/`** (Go, no croc, no Wails): keypair, trust store, SAS pairing, offer
  sign/verify, croc-code derivation. Fully unit-testable with `go test -race`, no network, no
  broker, no mobile. The de-risking wedge.
- **New broker service** (separate deploy, own repo): device registration (`pubkey → push
  token`, signed), signed-offer relay, one push provider to start (FCM). Real infra + secrets
  (APNs certs, FCM project).
- `internal/services/`: new `PairingService` adapter + `pairing:*` events; reuses the OS
  notifications service introduced by the `transfer-complete-notifications` change (interactive
  variant with action buttons).
- `internal/transfer/`: **unchanged in principle.** One real wrinkle — the receive-destination
  model owns the process CWD and `os.Chdir`es per receive, which is desktop-shaped; mobile
  sandboxes have no free CWD and no `~/Downloads`, so the receive-dest mechanism needs rework
  for mobile (see `design.md` R1). The `ReceiveOptions{}` placeholder already anticipates an
  "auto-accept policy" option.
- `frontend/`: new "Devices" panel (pair, list trusted, incoming-request modal). Mobile styling
  via the existing Puppertino path.
- Distribution / ops: an Apple Developer account, push certificates, and an FCM project become
  hard dependencies the moment mobile wake-from-closed is in scope.

## Relationship to other changes

- Builds on `transfer-complete-notifications` — reuses its Wails notifications service, extended
  to interactive Accept/Decline actions.
- Sibling to `deep-link-receive` — both remove code-typing from the receive flow. Deep-link
  carries the code in a *link* (still one manual click); trusted-devices carries authorization
  in a *device identity* (the notification replaces the link). They can coexist.
