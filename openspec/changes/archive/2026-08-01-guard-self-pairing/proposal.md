## Why

A device can currently pair with itself. Show a code on one install and redeem that
same code in the same install: the broker mailbox room accepts two WebSocket clients
regardless of where they come from, SPAKE2 succeeds (same phrase both sides), and the
SAS matches (ECDH against one's own public key is still deterministic). Every
cryptographic gate passes because nothing in the stack ever asks "is this me?". The
user confirms and the install writes its own public key into its own trust store.

Nothing in `pairing/` compares a peer's fingerprint to the local one — not the two
`trust.add` call sites in `PairingService`, and not `TrustStore` itself, which is
never told the local identity and so cannot self-guard. That missing invariant is the
root gap.

The result is not privilege escalation (self-trust grants an attacker nothing they
could not already do with the private key), but it does leave the app broken in
visible ways: a phantom device in your own list, a self-addressed offer that verifies
and prompts you, and a degenerate glare tiebreak (`my_fp < peer_fp` is false when the
fingerprints are equal, so the device cancels its own send and surfaces its own
offer). It also gives a shoulder-surfer a cheap confusion attack: redeem the code you
are displaying, reflect your own public identity back (it is public), and you add a
phantom device while the real pairing session is burned.

## What Changes

- **Trust store learns the local fingerprint and refuses to hold it.** `TrustStore`
  gains the local fingerprint at construction, and `add` rejects an entry whose
  fingerprint equals it. One backstop that closes every current and future caller.
- **Load-time purge.** `TrustStore::load` drops a self-entry already written to
  `trust.json` by this bug, so existing installs heal on next start with no migration
  step.
- **Both pairing protocol sites bail before trusting.** The shower checks the
  redeemer's decoded identity before raising the confirm dialog, so the user is never
  asked to approve a pairing the code already knows is bogus. The redeemer checks the
  shower's identity in the sealed reply.
- **A distinct wire code for "same device".** The reply byte gains `0x02` alongside
  the existing `0x01` (confirmed) and `0x00` (declined), so the redeemer can tell
  "the other side said no" from "that was me".
- **The redeemer tracks its own live codes** so it can tell the two self-pair shapes
  apart and say the right thing: the same install redeeming its own displayed code,
  versus two machines that share a copied `identity.json` and therefore one
  fingerprint. Both are blocked; they get different copy.
- Cross-machine identity clones become unpairable. Intended: one fingerprint on two
  installs also makes broker `/fp` routing ambiguous. Called out because
  restore-from-backup onto a new laptop reaches it.

## Capabilities

### New Capabilities

None. This adds a missing invariant to existing capabilities.

### Modified Capabilities

- `device-pairing`: `Local trust store` gains the never-hold-own-identity invariant
  and the load-time purge. `Pairing establishment over a short code` gains the
  self-pair rejection at both protocol sites, before either device mutates trust.
- `device-management`: `One-tap confirmation without naming` gains the rule that a
  self-pair never reaches the confirmation at all, plus the user-facing copy for the
  two rejection shapes.

## Impact

- `src-tauri/src/pairing/trust.rs` — `TrustStore::load` / `in_memory` take the local
  fingerprint; `add` gains the rejection; `load` purges a self-entry.
- `src-tauri/src/pairing/service.rs` — `ShowTask::run` (shower check, `0x02` reply),
  `redeem_pair_code` (reply check, `0x02` handling), `show_pair_code` (register the
  live code), plus the live-code registry on `PairingService`.
- No IPC surface change: no new command, no new event struct. The rejection travels
  as the existing `Result` error from `redeem_pair_code`.
- Broker unaffected — it stays a dumb relay and never learns either identity.
- `src/lib/pairing-app.svelte.ts` and the Devices page need no change beyond
  surfacing the error string that already flows through the redeem path.
- Glare tiebreak, `send_to`, and offer verification need no guard of their own: with
  the store invariant in place, the local fingerprint can never be trusted, so those
  paths already refuse.
