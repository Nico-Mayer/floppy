# Design: Tauri + iroh Migration

## Decision: iroh over magic-wormhole.rs

Both are Rust-native P2P transports that could replace croc. iroh is chosen.

| Factor | magic-wormhole.rs | **iroh + iroh-blobs (chosen)** |
| --- | --- | --- |
| Human code phrase | built in | layered (see rendezvous) |
| Resume | weak / none | BLAKE3 content-addressed, resume-by-hash |
| Progress | callback/stream | stream — no polling race |
| Transport | transit relay + direct | QUIC, hole-punching, relay fallback |
| Mobile | portable Rust, desktop-tested (Warp/GTK) | built for mobile, shipped in mobile apps |
| Fit with trusted-devices | separate model | node identity **is** a keypair — same model |

The one thing magic-wormhole gives for free (human codes) is exactly the thing floppy already has infrastructure for (the broker + a keypair identity). iroh's resume and mobile story are decisive, and its key-based node identity unifies cleanly with the trusted-device design. croc interop is not required, so there is no reason to stay protocol-compatible with either croc or wormhole.

## Architecture

Both transfer flows do the same job — get one peer an **iroh ticket** for the other — then transfer over iroh. They differ only in how that ticket exchange is authenticated.

```
  TRUSTED DEVICE                      QUICK SHARE (code phrase)
  fingerprint known                   no stored key
        │                                   │
        ▼                                   ▼
  broker: route by fp            broker: code → mailbox room
        │                                   │
  signed offer carries           SPAKE2(code) → key K;
  iroh ticket + NodeId           ticket + NodeId encrypted under K
        │                                   │
        └───────────────┬───────────────────┘
                        ▼
        iroh dial NodeId  ──►  QUIC (hole-punch, relay fallback)
                        │      connection authenticated by NodeId,
                        │      pinned to the NodeId from the exchange
                        ▼
        iroh-blobs: BLAKE3-verified stream, resume-by-hash
```

Layers:

- **Frontend (SvelteKit, static/SPA)** — UI unchanged in spirit. Calls the core via Tauri `invoke()`, subscribes via `listen()`. Event names/payloads keep the `croc:*` vocabulary so component logic ports with minimal edits.
- **Tauri core (Rust)** — commands (`send`, `receive`, `pair`, `quick_share`, `cancel`), event emission, asset/preview route, plugin wiring.
- **transport (Rust)** — iroh node lifecycle, `iroh-blobs` send/receive, progress stream → events, cancel via task abort, resume via the blob store.
- **rendezvous (Rust)** — broker client (WebSocket); trusted path (signed offers) and quick path (SPAKE2 mailbox) both produce/consume a ticket.
- **pairing (Rust)** — Ed25519 identity + X25519 kex + trust store, re-implemented from `internal/pairing/` with the same wire contract.
- **broker (Go, unchanged binary)** — fingerprint routing kept as-is; adds a code-mailbox mode.

## Security: NodeId binding (load-bearing)

The broker is a dumb relay and is not trusted. An iroh QUIC connection is authenticated by the dialed NodeId, but that only helps if the receiver knows the *correct* NodeId. So the sender's NodeId must be authenticated by the flow that carries it:

- **Trusted path**: the NodeId is inside the Ed25519-signed offer; the receiver verifies the signature against the trusted device's key before dialing.
- **Quick path**: the NodeId is folded into the SPAKE2 transcript (or the AEAD-encrypted payload keyed by `K`), so only a party that knows the code can present a NodeId the receiver will accept.

Without this, a malicious rendezvous swaps its own ticket and MITMs. With it, the short code / trusted key authenticates the iroh identity end-to-end and the relay stays dumb — same trust model as the current broker (which already forwards opaque signed blobs).

## Code phrase format

Keep the croc-style shape: leading digits + hyphen-joined words (e.g. `7-crayon-mimic`), normalized like `normalizeCode` (spaces → hyphens). First segment(s) select the broker mailbox room; the whole normalized string is the SPAKE2 password. Reuse a bip39-style or croc-derived word list. Minimum entropy comparable to croc's default.

## Resume model

iroh-blobs is content-addressed by BLAKE3; the ticket carries the root hash. Re-initiating the same transfer (same code / same trusted offer) resolves to the same hash and resumes from the local partial store automatically. This retires croc's `DestRoot/<code>/` folder-as-resume-state scheme, the Manager's CWD ownership/parking, and the "always leave before cleanup (Windows)" rule. Destination is chosen when the blob is exported to the filesystem, not by the working directory.

## Event contract (preserved)

The frontend keeps speaking the existing vocabulary; the Rust core emits it:

| Event | Payload (unchanged shape) |
| --- | --- |
| `croc:code` | `{id, kind, code}` — the code/ticket to display |
| `croc:send:progress` / `croc:recv:progress` | `{id, kind, done, total, file, index, count}` |
| `croc:sent` / `croc:received` | `{id, kind, dest?, ...}` |
| `croc:error` | `{id, kind, code, message}` |

Cancelled transfers still emit **no** terminal event. Sentinel error message text (`ErrBusy`-equivalents) stays stable as a frontend contract. (The `croc:` prefix is now a legacy name, kept to avoid churning the UI; it may be renamed in a later cleanup change.)

## Plugins replacing bespoke services

| Old (Go/Wails) | New (Tauri plugin) |
| --- | --- |
| `transfer-complete-notifications` change | `tauri-plugin-notification` |
| `deep-link-receive` change | `tauri-plugin-deep-link` |
| `FileService` picker / drag-drop | `tauri-plugin-dialog` (+ `EnableFileDrop` → Tauri drag-drop events) |
| `FileService.OpenPath` | `tauri-plugin-opener` |
| `preview.go` (`image/*` stdlib) | Rust `image` crate behind the same `/localfile` route |
| `stdio.SilenceUnusableStderr` (Win/Wails hack) | dropped — not needed on Tauri |

## Mobile notes

- iroh cross-compiles to iOS/Android and is used in shipped mobile apps.
- `tauri-plugin-dialog` gives a mobile-native picker that hands back a readable path/sandbox copy — this resolves the content:// (Android) and security-scoped-URL (iOS) blockers `preview.go` called out, because iroh needs the bytes anyway and previews then run on the sandbox copy.
- Preview memory budgets (`thumbMaxSourcePixels`, `decodeSlots`) must be lowered for phones per the existing `preview.go` notes; consider platform thumbnail APIs later.

## Migration slices (branch is long-lived; apply incrementally)

1. **Scaffold** (done by the author): `create-tauri-app` on a new branch, SvelteKit static/SPA frontend, re-add shadcn-svelte components and the transfer UI; wire an empty Rust core with stub commands/events.
2. **Transport MVP**: iroh + iroh-blobs send/receive between two nodes over the public relay; emit progress/done/error; cancel; ad-hoc ticket copy/paste (no broker yet). Proves the transport end-to-end.
3. **Quick share**: broker code-mailbox mode (Go) + Rust SPAKE2 client; human code → ticket exchange → transport; NodeId binding.
4. **Trusted devices**: port `pairing/` to Rust; signed-offer path over the existing broker fingerprint mode; ticket carries NodeId.
5. **Plugins/polish**: notifications, deep-link, previews via `image`, drag-drop, open-folder.
6. **Mobile**: iOS + Android targets; picker via dialog plugin; preview budgets tuned.

## Risks / open questions

- **Relay**: iroh's default relays are n0-operated. Decide whether to rely on them, self-host iroh relays, or both (mirrors the current self-hosted-croc-relay option in `RelayConfig`).
- **iroh-blobs API surface** is younger than croc's; pin versions and expect churn on the branch.
- **Broker code-mailbox mode** must not weaken the register-proof story; the existing `registerMessage` replay caveat still applies and the mailbox mode should get a broker-issued nonce if this graduates past desktop-first.
- **SvelteKit SPA vs Tauri asset serving**: use the static adapter with SPA fallback; confirm the `/localfile` preview route coexists with SvelteKit routing (Tauri custom protocol or a plugin route).
- **LAN discovery**: croc used multicast; iroh has its own local discovery. Confirm it satisfies the same-network-fast-path expectation.
