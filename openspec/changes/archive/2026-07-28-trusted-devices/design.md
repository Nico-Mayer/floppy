# Design notes — trusted devices

> Findings from the 2026-07-28 exploration. Framing constraints were fixed by the user during
> the session:
>
> 1. Wake-from-closed is needed **only on mobile**.
> 2. **Mobile-first** — mobile drives the design, desktop follows.
> 3. **Always** an interactive notification with an Accept/Decline prompt — no auto-accept of
>    any incoming data; after accept, no passphrase / code entry.
> 4. A dedicated signaling/push broker is acceptable if one is unavoidable (it is).

## The two subproblems croc does not solve

Croc's whole model is a _shared secret both sides already hold_ (the code phrase). It has no
identity, no persistence, no accounts. Trusted devices needs two things croc gives you neither
of:

```
A. IDENTITY + PAIRING   — "which devices are trusted, and prove it without a server account"
B. RENDEZVOUS + WAKE    — "reach a (maybe closed) trusted device with no human-typed code"
```

The file transfer itself stays **100% croc + the existing `transfer.Manager`**. Everything new
is a layer _above_ the Manager that (a) authorizes, (b) wakes/notifies, and (c) manufactures a
croc code automatically, then calls `Send` / `Receive`. This respects the architecture rule
that `internal/transfer` stays croc-only and Wails-free.

## End-to-end flow (mobile-first, the real path)

```
A (mobile, foreground)                          B (mobile, CLOSED)
  tap "Send to Bob"
  sign offer{from:pk_A, transferId, ts}
  POST signed offer ──────▶ ┌─────────────┐
                            │  BROKER     │  push_token[pk_B]
                            │ (login-less)│───── APNs / FCM push ───┐
                            └─────────────┘                         ▼
                                                    ┌───────────────────────────┐
                                                    │ OS notification (closed):  │
                                                    │ "Alice — 3 files (412 MB)" │
                                                    │   [ Accept ]  [ Decline ]  │
                                                    └───────────┬───────────────┘
                                    Decline ◀── handled by OS, broker told, app never opens
                                    Accept  ──▶ app launches → foreground
  both derive code = HKDF(secret_AB, transferId)      verify offer sig vs trust store
  Manager.Send(code) ◀──────── croc relay ──────────▶ Manager.Receive(code)
        (both foreground now — croc transfer runs unchanged)
```

**Key insight that avoids the hardest problem:** the transfer runs _only after_ Accept brings
the app to the foreground. So there is **no** need for background execution, silent push, or
background croc — iOS's severe background limits never bite. All you need from the platform is
an _alert push with action buttons_, which the OS renders while the app is dead.

## Pairing protocol (subproblem A)

```
Device A                              Device B
sk_A, pk_A  (once, persisted)         sk_B, pk_B

PAIRING (in person, one time):
  A shows QR { pk_A, rendezvous hint }
  B scans → learns pk_A
  both run an authenticated key exchange (ECDH over the identity keys)
  ┌──────────────────────────────────────────────┐
  │ SAS compare: both screens show e.g. "47 91"   │  ← defeats MITM during pairing
  │ user confirms "matches" on both               │
  └──────────────────────────────────────────────┘
  A.trust += { pk_B, "Bob's laptop" }
  B.trust += { pk_A, "Alice's phone" }
```

SAS (short-authentication-string) compare is the standard defense (Signal safety numbers,
Wormhole). It is the _only_ manual step, and only once per device pair, ever.

**Code derivation** — after pairing the two devices share a secret (the ECDH output, or a
secret confirmed during pairing). Per transfer:

```
code = HKDF(shared_secret_AB, transferId)      # both compute identically
```

`transferId` is a fresh per-offer value. The derived code is unguessable by outsiders and never
touches a human. croc's own PAKE still runs on top — the derived code is just fed in as the
shared secret. croc's caveat still applies: the relay room is the first 4 chars of the code, so
the derivation must produce well-spread prefixes.

## The broker (subproblem B)

Mobile wake-from-closed forces this — a closed iOS/Android app can be woken **only** by
APNs/FCM. There is no LAN-only or serverless first phase for mobile. The broker is the spine.

It stays **login-less** — every request is authenticated by a device-key signature, not an
account:

```
register(pubkey, push_token, sig)      # device announces where to push it
send_offer(signed offer, target pk)    # broker verifies target exists, pushes it
(optional) relay pairing handshake     # if pairing is not purely in-person/LAN
```

The broker never sees file contents (that is croc, end-to-end between the devices). What it
_does_ see depends on the notification-privacy decision below.

## Residual risk stack (ranked, mobile-first)

```
🔴 R1  Receive/CWD model is desktop-shaped.
       transfer.Manager owns the process CWD and os.Chdir()es into a per-code
       folder per receive; croc writes to the CWD by design. Mobile apps have a
       sandbox container, no ~/Downloads, and chdir is dubious on iOS. The
       receive-dest mechanism needs rework for mobile — park CWD at the sandbox
       root, or teach croc an explicit output dir. SCOPED to receive-dest, not
       the trust design. GATES whether files can land on mobile at all.

🟠 R2  APNs / FCM operations. Apple Developer account, push certificates, FCM
       project, broker stores push tokens. Real infra + secrets to run and rotate.

🟠 R3  Notification-privacy tradeoff.
       Rich push ("Alice — 3 files") → the broker sees who↔who and file-count
       metadata. A blind broker keeps that private but then the notification
       cannot name the sender until the app opens — UNLESS an iOS Notification
       Service Extension (Android data-message handler) decrypts the payload
       on-device before display. That keeps the broker blind AND the notification
       rich, at the cost of more platform work. Decision shapes the wire protocol.

🟡 R4  croc LAN multicast (239.255.255.250) is restricted on iOS without a
       multicast entitlement. Acceptable to fall back to relay-only on mobile.

🟢 R5  Pairing UX (QR + SAS) is well-trodden (Signal / Syncthing). Lowest risk.
```

## Suggested phasing

```
P0  internal/pairing — identity + trust store + SAS pairing (QR) + code derivation.
    Pure crypto. Testable with `go test -race`; NO broker, NO mobile, NO croc.
    The de-risking wedge — proves the trust core before any infra spend.
P1  Broker MVP — register + signed-offer relay + one push provider (FCM/Android easier
    than iOS for push).
P2  Client end-to-end on ONE platform: offer → push → Accept → derive code → Manager.
P3  Receive-dest rework (R1) so files actually land on mobile.
P4  iOS push + (optional) notification-service-extension for R3, if broker-blind matters.
```

## Decisions taken during exploration

- **Never auto-accept.** Every incoming offer raises an interactive Accept/Decline prompt; no
  bytes hit disk before an explicit accept. Mirrors the existing "never auto-start a receive"
  rule from clipboard/deep-link. After accept, zero further entry (no passphrase, no code).
- **Transfer runs only in the foreground, post-Accept.** This is what lets the design skip
  background execution and silent push entirely — the single biggest simplification.
- **Reuse croc + `transfer.Manager` unchanged.** Trusted-device send is a new layer that
  derives a code and calls the existing API; it is not a new transport.
- **Broker is login-less**, authenticated by device-key signatures only. "No login" is a hard
  product constraint, not a nice-to-have.
- **Mobile-first framing** — mobile constraints (wake-from-closed, sandbox, push) drive the
  design; desktop is the easier subset that follows.

## Open questions

1. **R1 — does the current app even run on mobile today?** Is the CWD/receive model functional
   in the iOS/Android sandbox, or is the `build/ios` + `build/android` scaffolding
   present-but-unproven? This gates the whole effort and should be spiked first.
2. **R3 — broker privacy stance**: rich-push (broker sees who↔who + metadata) vs blind-broker
   (needs a notification-service-extension for rich display). Shapes the wire protocol.
3. **Broker: build vs piggyback.** croc's public relay is not a general pub/sub; the broker is
   almost certainly a new self-hosted service. Own repo? Hosting? Cost/ops owner?
4. **Identity persistence per platform**: desktop file vs iOS Keychain / Android Keystore, and
   what happens on reinstall (identity lost → re-pair). Backup/export of identity?
5. **Pairing transport**: purely in-person QR + LAN, or does pairing also route through the
   broker (needed when the two devices are never on the same network)?
6. **Trust revocation / device removal**: how a user un-trusts a lost device, and whether the
   broker must honor a revocation (it holds the push token).
7. **Custom-code collision** — derived codes sharing a 4-char relay-room prefix collide (croc
   caveat); confirm the HKDF output spreads prefixes, or namespace the room another way.
