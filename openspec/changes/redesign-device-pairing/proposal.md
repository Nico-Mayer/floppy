## Why

Adding a trusted device today means showing a `floppy://pair/...` string on one
device and **pasting** it into the other. That is neither a link (it does not
click) nor a code (it is too long to type), so the mental model is muddled. There
is also no home for managing devices, no self-identity a device can advertise, and
the vocabulary ("pair link", "key", "trusted") is inconsistent. We have no users
yet, so we can redesign the whole flow around one primitive people already
understand from the transfer flow: a short code (with a QR shortcut on mobile).

## What Changes

- **New dedicated Devices page** (top-level nav, not Settings): edit this device's
  own name at the top, see paired devices below, add / rename / remove.
- **Symmetric "Add a device" flow.** One screen shows this device's QR + code and
  also offers a scanner / code input. Whoever has a camera scans; whoever does not,
  types. No "am I the sender or receiver" decision, no initiator/opener roles.
- **Establish pairing over a short code**, same format as transfers
  (`1234-word-word-word`), carried by QR on mobile. The digits pick the broker
  rendezvous room; the words are the SPAKE2 password. Identities are exchanged
  inside the PAKE-sealed payload, so nothing long lives in the code.
  **BREAKING:** removes the one-sided pasteable pair link, the `create_pair_link` /
  `open_pair_link` commands, and the `floppy://pair/...` deep-link route.
- **One-tap confirm, zero name typing.** Scanning/entering the code is the
  scanner's consent; the device that showed the code confirms once ("Add
  NicoPC?"). The QR path skips the SAS (the secret came out-of-band); the typed
  path shows the SAS to compare.
- **Per-device self-name.** Each install generates a friendly name once on first
  run (a random two-word combo, e.g. `brave-otter`), editable on the Devices page.
  It is advertised during pairing and re-sent on the next transfer, so a renamed
  device stops showing a stale label (option B). No always-on connections: the
  refresh rides the signed offer that a transfer already sends.
- **Peer labels are local.** The name you see for a device defaults to the
  self-name it advertised; you may rename it locally (an override that is never
  sent back and always wins over refreshes).
- **Pairwise only, no mesh.** Pairing a third device links it to the one you are
  standing at, not to your other devices.
- **Terminology migration** across all UI copy: "code" (typed) or QR (scanned),
  never a pasted link; "your devices" / "paired" / "Remove", never "pair link",
  "key", or "trusted".

## Capabilities

### New Capabilities

- `device-management`: the user-facing device surface. A device's editable
  self-name, the Devices page (list, rename, remove), the symmetric add-a-device
  flow (QR + code), one-tap confirm, and local peer-label semantics
  (default-from-advertised, local override, refresh on next transfer).

### Modified Capabilities

- `device-pairing`: replace one-sided pasteable-link establishment with a
  symmetric single-use short-code rendezvous (QR on mobile) that exchanges
  identities under the PAKE key; add a self-name field to the exchanged identity
  and to the signed transfer offer; keep the SAS for the typed path only.

## Impact

- **Backend (`src-tauri/src/pairing/`):** move establishment from the `/fp`
  link/fingerprint path to the `/ws` code-mailbox rendezvous (reusing
  `src-tauri/src/rendezvous/` `code` + `pake`); generate/persist a self-name in the
  identity/trust layer; carry self-name in the sealed identity exchange and in
  `PairingOfferEvent`; remove `create_pair_link` / `open_pair_link`; add commands
  to show a pairing code, redeem one, set the self-name, and rename a peer locally.
- **Deep links (`src-tauri/src/lib.rs`):** drop the `floppy://pair/...` route.
  `floppy://receive?code=...` is untouched.
- **Frontend (`src/`):** new `/devices` route replacing `/pair`; remove the
  paste-a-link UI; add QR display, mobile camera scan, code entry, self-name
  editor, local rename; update the Send "Send to" picker entry point; terminology
  pass. `bindings.ts` regenerates from the new command/event set.
- **Broker (`broker/`):** reuse the existing `/ws` mailbox for the pairing
  rendezvous; the `/fp` path is no longer on the pairing critical path (kept for
  trusted-send routing).
- **Docs / memory:** supersedes the archived `trusted-devices` link-pairing model.
