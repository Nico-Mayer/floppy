# Trusted devices — how it works today

Plain-language notes on the trusted-device feature as it stands: what it does, where
your data lives, and how the pieces fit. This is the **desktop-first slice** — it works on
desktop with the app open. Mobile and wake-a-closed-app (push) are not built yet; see
"What's not done" at the bottom.

## What it does

Normally, sending a file with Floppy means one side generates a code phrase and the other
side types it in. Trusted devices removes that after a one-time setup:

1. **Pair once** — two devices exchange their identities (paste or QR) and confirm a short
   number matches on both screens.
2. **Send with no code** — pick a trusted device in the Send panel; the other device gets a
   pop-up ("Alice wants to send you 3 files") with **Accept** / **Decline**. On Accept, the
   transfer runs. Nobody types a code.

The file transfer itself is still plain croc — the trusted-device layer only figures out the
code automatically and tells the other side when to start.

## Where your data is stored (on your device)

Two small files, in one directory:

- **`identity.json`** — this device's private keys. This *is* your device's identity. It is
  written with owner-only permissions (0600). If you delete it, the device becomes a
  different identity and must be re-paired.
- **`trust.json`** — the list of devices you trust: each other device's public keys and the
  name you gave it. Removing a device (the trash icon in *Trusted devices*) deletes it here.

**Location of that directory:**

- Default: your OS config directory + `floppy/`. On macOS that's
  `~/Library/Application Support/floppy/`. (Linux: `~/.config/floppy/`. Windows:
  `%AppData%\floppy\`.)
- Override: pass `--identity-dir <path>` (or set `FLOPPY_IDENTITY_DIR`). This is how two test
  instances run on one machine without sharing an identity, e.g. `/tmp/floppy-a`.

Nothing about trusted devices is stored in the cloud or on the broker. No account, no login.

## The three moving parts

```
┌─────────────────┐        ┌──────────────┐        ┌─────────────────┐
│  Device A       │        │   BROKER     │        │  Device B       │
│  (sender)       │        │ (relay only) │        │  (receiver)     │
│                 │        │              │        │                 │
│ identity.json   │        │  routes      │        │ identity.json   │
│ trust.json      │        │  signed      │        │ trust.json      │
│                 │        │  messages by │        │                 │
│  PairingService │◀──WS──▶│  fingerprint │◀──WS──▶│  PairingService │
└────────┬────────┘        └──────────────┘        └────────┬────────┘
         │                                                   │
         └──────────── actual files: croc, end-to-end ───────┘
                       (never through the broker)
```

- **`internal/pairing/`** — the crypto core. Keypairs, the trust store, the shared secret,
  the auto-derived code, the short verification number (SAS), and signing/verifying offers.
  Pure Go, no network, no UI. This is where identity and trust actually live.
- **`internal/broker/` + `cmd/broker/`** — a dumb WebSocket relay. It knows which device is
  online (by fingerprint) and forwards signed messages between them. It never sees file
  contents and stores nothing. Run it with `go run ./cmd/broker` (listens on `:8080`).
- **`internal/services/pairingservice.go`** — the glue exposed to the UI. It loads the
  identity, talks to the broker, shows the incoming prompt, and — on accept — hands the
  derived code to the existing transfer engine. The transfer engine (`internal/transfer/`)
  was not modified.

## What happens during a send (step by step)

```
A: pick files, choose "Bob" in the Send panel
A → broker → B:  signed OFFER  {who, transfer-id, file count, size}
B: verifies the offer is really from a trusted device, shows the Accept/Decline prompt
B: taps Accept  → signed RESPONSE(accept) → broker → A
A: starts sending first (croc creates the room + hashes the files)
A → broker → B:  READY
B: now joins and receives; files land in ~/Downloads/<code>/
```

Sender-first ordering is deliberate: croc's sender sets up the transfer, so the receiver only
joins once the sender is ready (same order as the classic type-in-a-code flow). If B
declines, A is told and nothing is written.

## Security, in short

- **Identity = keys on the device.** No passwords, no accounts.
- **Pairing uses a SAS** (the 6-digit number). Comparing it on both screens catches a
  man-in-the-middle if you exchanged identities over an untrusted channel. If you pasted the
  identity directly between two machines you control, the paste itself is the trust anchor
  and the SAS is just a double-check.
- **Every offer and response is signed** and checked against the trust store, so a stranger
  can't make your device send or receive.
- **The broker is untrusted** for content: it only routes. Files move directly between
  devices via croc, encrypted end-to-end. The broker does see *who talks to whom* and the
  offer metadata (sender name, file count) — see the privacy note in the design doc.
- **Known weak spot (desktop slice):** the broker registration proof is replayable (no
  server challenge yet). Harmless to file confidentiality — an attacker still can't derive
  the transfer code or read files — but a real deployment should add a challenge. Noted in
  `internal/pairing/identity.go`.

## Running the desktop demo

```
# 1. broker
go run ./cmd/broker

# 2. two app instances, separate identities
FLOPPY_IDENTITY_DIR=/tmp/floppy-a wails3 dev      # or a built binary
FLOPPY_IDENTITY_DIR=/tmp/floppy-b <same>
```

Because `wails3 dev` binds a fixed Vite port, you cannot run it twice; build once
(`go build -o /tmp/floppy-app .`) and run two copies of the binary instead, or run one in
`wails3 dev` and the other as the binary.

Pairing: in each window, **Account → Trusted devices → Show pairing code**, paste each
device's code into the other (**both directions** — each side must trust the other), confirm
the SAS matches, Trust. Then in the Send panel, queue files and pick the device from
**Send to**.

Dev shortcut: `--seed-trust "<encoded-public-key>[,name]"` (or `FLOPPY_SEED_TRUST`) pre-trusts
a peer at startup, skipping the paste step.

## Deploying the broker (Railway)

The broker is a tiny stateless WebSocket relay — one always-on instance that every
client dials. `Dockerfile.broker` + `railway.json` at the repo root make it a
push-button deploy:

1. Railway → New Project → Deploy from this repo. `railway.json` points the build at
   `Dockerfile.broker`, so Railway builds only `cmd/broker` (not the Wails app).
2. Railway injects `PORT` and the broker listens on it automatically. Railway also
   terminates TLS at its edge, so the process serves plain `ws` while clients connect
   over `wss://`.
3. Under Settings → Networking, generate a public domain. Your broker URL is then
   `wss://<your-app>.up.railway.app/ws` (note the `/ws` path).
4. Point clients at it: `FLOPPY_BROKER_URL=wss://<your-app>.up.railway.app/ws`
   (or `--broker-url`). A shipped build would bake this in as the default.

Verify it's up by opening the domain in a browser — the root path returns
`floppy rendezvous broker ok`.

Notes:
- **Single instance only.** The broker keeps live connections in memory; do not scale
  it to multiple replicas yet (clients on different replicas can't reach each other).
- Still missing before real exposure: the register-nonce fix and sealed signal blobs
  (see "What's not done"). TLS itself is handled by Railway.

Run locally instead: `go run ./cmd/broker` (listens on `:8080`, clients use
`ws://localhost:8080/ws`).

## What's not done (future arcs)

Tracked in `openspec/changes/trusted-devices/design.md` (phases P3–P4):

- **Mobile** — the receive-to-`~/Downloads` model relies on a working directory that mobile
  sandboxes don't provide (the "R1" gap). Needs rework before mobile can receive.
- **Wake a closed app** — needs a push service (APNs/FCM) and the broker to hold push tokens.
  Only then does "send to a phone that's in your pocket" work.
- **Broker for real** — currently localhost, no TLS, no reconnect, single send/receive at a
  time. Needs a deployment story and a registration challenge (see security note).
