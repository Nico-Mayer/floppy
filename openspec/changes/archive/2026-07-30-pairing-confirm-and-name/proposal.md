# Pairing: confirm before adding, and name trusted devices

## Why

One-sided pairing now works over the fp channel, but it commits trust with **no
user confirmation and no useful name**:

- The device that _shows_ a link has another device added to its trust store the
  instant someone opens the link — silently, no prompt. The user reported this
  as "it simply adds."
- Every trusted device is stored as `device-<fp[..8]>`, so the list is a wall of
  hex fingerprints. There is no way to tell which physical device is which.

Trust is a security boundary; adding to it should be a deliberate, legible act.

## What Changes

- The **opener** of a link consents by the act of opening, so it still adds the
  initiator directly — but can rename it afterward.
- The **initiator** (the device showing the link) no longer auto-adds. When a
  device completes the pairing handshake against its link, the initiator raises
  a **confirm-and-name** prompt ("A device paired using your link — add it?")
  and only writes to the trust store on approval; dismissing drops it.
- Trusted devices can be **named/renamed** from the Devices list on either side.

Security is unchanged: the SPAKE2 exchange still authenticates the two
identities end-to-end. This adds a human confirmation gate and a label on top.

## Capabilities

### Modified Capabilities

- `device-pairing` gains an initiator-side confirmation gate before trust is
  written, and rename of trusted devices.

## Impact

- `src-tauri/src/pairing/service.rs`: initiator holds the peer identity pending
  a confirm instead of trusting on seal; new `confirm_pair` / `dismiss_pair` /
  `rename_device` service methods; new `PairingEvent::Request`.
- `src-tauri/src/pairing/trust.rs`: `rename`.
- `src-tauri/src/lib.rs`: new commands + `PairingRequest` event in the specta
  surface (regenerates `bindings.ts`).
- `src/lib/pairing-app.svelte.ts`, a confirm dialog, and `DevicesView.svelte`
  rename UI.
