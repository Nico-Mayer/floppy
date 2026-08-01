## 1. Trust store invariant (C + D)

- [x] 1.1 Add an `own_fingerprint: String` field to `TrustStore` (`src-tauri/src/pairing/trust.rs:52`); take it as a second argument on `load(dir, own_fingerprint)`.
- [x] 1.2 Keep `in_memory()` no-arg by seeding an empty owner fingerprint (never collides with a 64-hex real one), and add `in_memory_owned_by(fp)` for guard tests.
- [x] 1.3 Reject in `add`: if `key.fingerprint() == own_fingerprint`, return an error and leave the map untouched (no persist).
- [x] 1.4 Purge in `load`: drop a parsed entry whose fingerprint is the owner's, and persist the cleaned store only when something was actually removed.
- [x] 1.5 Update `PairingService::new` (`service.rs:118`) to `TrustStore::load(dir, &identity.public().fingerprint())` — `identity` is already loaded two lines above.
- [x] 1.6 Unit tests in `trust.rs`: own identity rejected by `add`; store unchanged and `trusted()` false after a rejected add; a persisted self-entry is gone after `load`; a store holding a self-entry plus real peers loses only the self-entry, with advertised names and local overrides intact; no rewrite when there was nothing to purge.

## 2. Pairing protocol guards (B)

- [x] 2.1 Add `active_codes: Arc<Mutex<HashSet<String>>>` to `PairingService`; insert the normalized phrase in `show_pair_code` and remove it in the spawned task's cleanup so both the completion and `PAIR_TIMEOUT` paths clear it.
- [x] 2.2 Shower check in `ShowTask::run` (`service.rs:378`): after `PublicKey::decode`, compare the fingerprint to the local one. On a match, skip the confirm entirely (no `pending_confirms` insert, no `PairingEvent::Request`), send `0x02`, log, and end. `ShowTask` needs the local fingerprint available — it already holds `identity`.
- [x] 2.3 Redeemer check in `redeem_pair_code` (`service.rs:208`): compare the shower's fingerprint from the sealed reply to the local one and fail before `trust.add`.
- [x] 2.4 Handle `0x02` in the redeemer's reply match (`service.rs:203`) as a distinct arm ahead of the `_ =>` fallback.
- [x] 2.5 Pick the message: on either self-pair detection, consult `active_codes` for the normalized phrase — present means "this device's own code", absent means "these devices have the same identity".
- [x] 2.6 Write both strings to the UI copy rules: no em dash, and no "trusted", "key", "fingerprint", or "pair link".
- [x] 2.7 Clear the code-entry field in the `finally` of `connect()` (`src/routes/devices/+page.svelte`) so a spent code never lingers after a failed attempt.

## 3. Tests

- [x] 3.1 An install redeeming a code it is currently showing fails, and neither side's trust store gains an entry.
- [x] 3.2 Two services constructed over one identity directory (equal fingerprints) fail to pair, and the error is the shared-identity message, not the own-code one.
- [x] 3.3 The shower raises no `PairingEvent::Request` when the redeemer's fingerprint is its own — assert on the emitter, since the point is that no dialog appears.
- [x] 3.4 Reflected-identity case: a redeemer that seals back the shower's own public identity gets refused, the shower emits no request, and the redeemer is not trusted.
- [x] 3.5 `0x02` is distinguishable from `0x00`: a user decline still reports as a decline and does not report as a self-pair.
- [x] 3.6 `active_codes` is empty after a shown code completes. (Timeout branch not asserted: `PAIR_TIMEOUT` is a 120s const, not injectable. Both branches share one removal line. Recorded in design.md.)
- [x] 3.7 A genuine two-identity pairing still ends with both sides trusting each other — the existing symmetry test must stay green.

## 4. Verify

- [x] 4.1 `cargo test` green in `src-tauri/`.
- [x] 4.2 Confirm `src/lib/ipc/bindings.ts` is unchanged (no new command or event struct was introduced).
- [x] 4.3 Manual (user-verified): in a dev build, show a code and type it into the same install. Own-code error shown, no confirmation dialog, no new row on the Devices page.
- [ ] 4.4 NOT RUN (manual): start with a `trust.json` containing a self-entry, launch, and confirm the row is gone from the Devices page and from the file.

## 5. Close out

- [x] 5.1 Resolve the design's open question on whether the showing device should also emit `PairingEvent::Error`, or record the deferral.
- [x] 5.2 `openspec validate guard-self-pairing --strict`.
- [x] 5.3 `npm run check` clean after the code-entry change.
