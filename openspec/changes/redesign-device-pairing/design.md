## Context

Trusted devices already work end to end: each install has an Ed25519 + X25519
identity, a local trust store, and signed offers verified before a code-free
transfer (`src-tauri/src/pairing/`). What is weak is how a device *joins* that
store. Today the initiator shows a one-sided `floppy://pair/<base64url(json)>`
link and the other device **pastes** it; establishment runs over the broker's
`/fp` fingerprint channel because the link carries the initiator's identity up
front. The string is neither clickable nor typeable, there is no home for managing
devices, and the wording ("pair link", "key", "trusted") is inconsistent.

Meanwhile quick-share transfers already solve "two strangers agree over a short
code": `<4 digits>-<word>-<word>-<word>`, digits pick the broker `/ws` mailbox
room, words are the SPAKE2 password, and the sender's NodeId is bound into a
PAKE-sealed payload the broker cannot read (`src-tauri/src/rendezvous/`). Pairing
can reuse exactly this primitive, exchanging long-term identities instead of a
transfer ticket. No users exist yet, so we can replace the link flow outright.

## Goals / Non-Goals

**Goals:**
- One primitive to add a device: a short code (typed) or its QR (scanned). No
  pasted links anywhere.
- Symmetric flow: no initiator/opener role; whoever redeems consents, whoever
  showed the code confirms once.
- A dedicated Devices page: edit this device's self-name, list/rename/remove peers.
- Self-names that introduce a device automatically and self-heal on next transfer,
  with no always-on connections.
- Reuse the existing rendezvous + PAKE machinery rather than inventing a second
  handshake.

**Non-Goals:**
- Mesh / multi-device propagation (pairing stays strictly pairwise).
- Accounts, cloud identity, or a name directory.
- An online/offline presence indicator (the broker already knows who is connected;
  deferred as a separate future feature).
- Changing the transfer flow itself, or the `floppy://receive?code=...` deep link.

## Decisions

### D1: Establish pairing over the `/ws` code mailbox, not the `/fp` link channel

The code carries no identity, so the opener cannot route by fingerprint up front.
Both devices instead join the mailbox room from the code's four digits and run
SPAKE2 with the words, then exchange `{identity, self-name}` sealed under the PAKE
key. Both persist the other on success.

- **Why:** identical trust model to quick share (broker is a dumb relay, sealed
  payload is load-bearing), and it deletes a whole parallel establishment path.
- **Alternative considered:** keep `/fp` and shorten the link with a server-stored
  token. Rejected: still link-shaped, still needs a landing page, and keeps two
  handshakes. The `/fp` channel remains for trusted-send routing, just not for
  establishment.

### D2: Self-name is one persisted value per device, advertised in the exchange and on every offer

Generated once on first run as a random two-word combo (own wordlist, not the
transfer wordlist to avoid confusion), editable on the Devices page, never derived
from the hostname (privacy, on-brand for a no-cloud app). It rides the sealed
pairing payload and the existing signed `PairingOfferEvent`.

- **Why option B (refresh on next transfer) is free:** a device holds exactly one
  persistent socket, to the broker, for incoming offers/requests. It never holds
  connections to peers at rest. The self-name piggybacks the signed offer a
  transfer already sends, so a renamed device stops looking stale after the next
  interaction, with zero new sockets and no presence polling.
- **Alternative considered:** snapshot-at-pair (name frozen until manual rename).
  Simpler but goes stale; rejected since refresh costs nothing.

### D3: Peer label = local override ?? advertised self-name ?? fingerprint fallback

The trust-store entry keeps the peer's advertised self-name separately from an
optional local override. Override always wins, is never transmitted, and refreshes
skip any entry that has one.

- **Why:** "my names for my devices" is the right mental model, and it keeps rename
  purely local (no sync, matches today's behavior).

### D4: One confirmation, on the shower; SAS only on the typed path

Redeeming a code is the redeemer's consent (they possess the out-of-band secret),
so the redeemer sees no dialog. The device that showed the code confirms once,
naming the peer. A scanned QR delivered the full secret out-of-band, so MITM is not
possible and no SAS is shown; a typed code is lower-bandwidth, so its confirm shows
the SAS to compare. Naming is never required (self-name arrives), only optionally
edited inline.

- **Why:** minimum taps while keeping a legible consent moment for durable trust.
- **Alternative considered:** zero-confirm "arming" (showing the QR auto-accepts the
  first scanner). Rejected: a bystander scanning the screen in the window would be
  trusted until noticed, too weak for persistent trust.

### D5: IPC surface changes (regenerated `bindings.ts`)

- Remove: `create_pair_link`, `open_pair_link`; remove the `floppy://pair/...`
  branch in `route_deep_link`.
- Add: a command to start showing a pairing code (returns the code + its QR
  payload), a command to redeem a code, a command to set this device's self-name,
  and a command to set/clear a local override name for a peer. `trusted_devices`,
  `untrust`, `accept`/`decline`, `send_to`, `identity` stay.
- Events: reuse `PairingOfferEvent`/`PairingPaired`/`PairingError`; add the
  self-name field where identity is exchanged. Confirm requests to the shower reuse
  the existing pairing-request event shape.

### D6: Devices page and navigation

New `/devices` route replaces `/pair`. Self-name editor at the top, paired list
(rename/remove) below, Add-a-device as a section/modal on the same page. The Send
"Send to" picker's pairing affordance routes here. Mobile Add opens the camera
first with the code as fallback; desktop leads with the QR + code and a code field.

## Risks / Trade-offs

- **Typed pairing code is lower entropy than the old link** → Mitigation: PAKE means
  no offline attack; the code is single-use with a bounded TTL and one online guess;
  the typed path shows the SAS. Consider a slightly longer word count for pairing
  than for transfers, since pairing trust is durable.
- **Name goes stale between transfers (option B)** → Mitigation: acceptable by
  design; you only read a device's name when you go to send to it, and it refreshes
  on that interaction. Local override sidesteps it entirely.
- **Removing a device is one-sided** → Mitigation: intended. Remove revokes *your*
  acceptance so the removed device can no longer send to you without a code; the
  stolen-device case is covered. The peer may still list you, which grants it
  nothing on its own.
- **QR scanning adds a camera dependency and permission prompt on mobile** →
  Mitigation: the typed code is always a complete fallback; camera denial degrades
  to code entry, never a dead end.
- **Breaking IPC/deep-link removal** → Mitigation: pre-users, single atomic change;
  regenerate `bindings.ts` and drop the dead route in the same PR.

## Migration Plan

1. Backend: add self-name storage + generation; add the code-rendezvous pairing
   exchange reusing `rendezvous::{code, pake}`; extend the sealed payload and
   `PairingOfferEvent` with self-name; add the new commands; delete
   `create_pair_link`/`open_pair_link` and the `floppy://pair` route. Regenerate
   bindings via `cargo test export_bindings`.
2. Frontend: add `/devices` (self-name editor, list, rename/remove, Add flow with
   QR + code + camera scan); delete `/pair` and the paste-a-link UI; repoint the
   Send picker; terminology pass across pairing copy.
3. Tests: Rust unit/hermetic coverage for the code exchange (both-trust, wrong
   words, single-use, expiry), self-name persistence, label override/refresh; keep
   the live E2E updated to the code flow.
4. No data migration: pre-users. Existing local trust entries (if any dev builds
   have them) simply gain an empty override and refresh their advertised name on the
   next transfer.

## Open Questions

- Word count / wordlist for pairing codes: reuse the transfer wordlist and length,
  or a distinct, slightly longer set so a pairing code is not mistaken for a
  transfer code? (Leaning distinct + one extra word.)
- Exact home for Add-a-device: a section on `/devices` vs a modal launched from it
  (both satisfy the spec; a modal keeps the page calm).
- Whether the shower's confirm should also show a one-line "how it was added"
  (scanned vs typed) for extra legibility.
