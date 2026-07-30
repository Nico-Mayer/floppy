## 1. Self-name (backend)

- [x] 1.1 Add a self-name wordlist (distinct from the transfer wordlist) and a generator that produces a random two-word combo
- [x] 1.2 Persist the self-name in the identity/trust layer: generate once on first run, load on start, expose a getter
- [x] 1.3 Add a `set_self_name` command that validates non-empty and persists the new value (plus a `self_name` getter command)
- [x] 1.4 Rust tests: generated once, stable across restart, edit persists

## 2. Trust store: advertised name + local override

- [x] 2.1 Extend the trust-store entry with `advertised_name` and optional `local_override`, keeping atomic write-temp-then-rename
- [x] 2.2 Compute the shown label as override ?? advertised ?? fingerprint fallback
- [x] 2.3 Add commands to set/clear a peer's local override (rename) — `rename_device` command + store `rename` (empty clears)
- [x] 2.4 On successful offer verification, refresh `advertised_name` unless an override exists — wired in `incoming_loop`, `Offer.self_name` added
- [x] 2.5 Rust tests: override wins and is not transmitted, refresh updates advertised name, fallback label when both empty

## 3. Pairing establishment over a short code

- [x] 3.1 Add a `show_pair_code` command: mint a `<4 digits>-<word>-<word>-<word>` code, join the `/ws` mailbox room, keep the session open until redeemed or timed out; return the code (QR rendered by the frontend)
- [x] 3.2 Add a `redeem_pair_code` command: normalize input, join the room, run SPAKE2 with the words
- [x] 3.3 Exchange `{public identity, self-name}` sealed under the PAKE key; both sides persist the peer on success (symmetric)
- [x] 3.4 Enforce single-use and bounded TTL on a shown code; expire quietly with no error to the shower
- [x] 3.5 Route the shower's confirmation through the pairing-request event (name + SAS + via), gate trust on confirm
- [x] 3.6 Add the self-name field to the sealed exchange and to the transfer offer
- [x] 3.7 Rust tests: `code_pairing_makes_trust_mutual` covers both-sides-trust + decline; wrong-words/tamper covered by `rendezvous::pake` tests (a full-protocol wrong-words case would block on the 120s mailbox timeout, so it stays at the pake layer)

## 4. Remove the link-pairing path

- [x] 4.1 Delete the `create_pair_link` and `open_pair_link` commands and their service methods
- [x] 4.2 Remove the `floppy://pair/...` branch from `route_deep_link` (leave `floppy://receive?code=...` intact)
- [x] 4.3 Remove now-dead pair-link types/tests (`link.rs` deleted; `Signal::Pair*` variants removed)
- [x] 4.4 Regenerate `src/lib/ipc/bindings.ts` via `cargo test export_bindings`

## 5. Devices page (frontend)

- [ ] 5.1 Add the `/devices` route with a self-name editor at the top (inline edit, saves via `set_self_name`)
- [ ] 5.2 Render the paired-device list with shown label, inline local rename, and remove (revokes trust)
- [ ] 5.3 Build the symmetric Add-a-device section: show this device's QR + code and a scan / code-entry control
- [ ] 5.4 Mobile: open the camera first for scanning, fall back to code entry when no camera or permission denied
- [ ] 5.5 Desktop: lead with the QR + code and a code-entry field (desktop-to-desktop)
- [ ] 5.6 Wire redeem: scanning or entering a code calls `redeem_pair_code` and shows a linking state
- [ ] 5.7 Delete the `/pair` route and the paste-a-link UI

## 6. Confirmation dialog (frontend)

- [ ] 6.1 Update the incoming pairing-request dialog to name the peer from its advertised self-name, with no required name input and an optional inline rename
- [ ] 6.2 Show the SAS only when the request came from a typed code; hide it for a scanned QR
- [ ] 6.3 Ensure the redeemer never sees a confirmation or name prompt

## 7. Entry points and terminology

- [ ] 7.1 Repoint the Send "Send to" picker pairing affordance to the Devices Add flow
- [ ] 7.2 Update navigation so Devices is a top-level entry (replacing the old Pair entry)
- [ ] 7.3 Terminology pass on all pairing copy: code / your devices / paired / Remove; drop pair link / key / trusted; no em dashes in UI text

## 8. Verification

- [ ] 8.1 `cargo test` green (unit + hermetic transport/pairing)
- [ ] 8.2 `npm run check` and `npm run lint` green; bindings.ts matches generated output
- [ ] 8.3 Live E2E updated to the code flow: pair two instances by code, confirm both trust, send code-free, rename and verify refresh on next transfer
- [ ] 8.4 Manual pass on desktop and mobile: scan-to-add, type-to-add, remove revokes, self-name edit reflected on the peer after a transfer
