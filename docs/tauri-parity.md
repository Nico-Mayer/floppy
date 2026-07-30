# Tauri/iroh vs Go/Wails — desktop parity audit

As of the desktop-parity milestone (`tauri-iroh-migration`, slices 1–5). The
Tauri build matches the Go/Wails build's desktop feature set, and adds a few
things the Go build never shipped. Verified by `cargo test` (transport/pairing/
quick-share), `go test -race` (broker), and **live cross-language E2E** against
the real Go broker (`live_quick_share_against_real_broker`,
`live_trusted_transfer_against_real_broker`).

## Commands (Go bound method → Tauri command)

| Go (Wails)                                                | Tauri                                           | Status                                                        |
| --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `CrocService.Send`                                        | `quick_share` (code flow) + `send` (raw ticket) | ✅                                                            |
| `CrocService.Receive`                                     | `receive` (routes code-phrase vs raw ticket)    | ✅                                                            |
| `CrocService.SendCoded/ReceiveCoded` (trusted, croc-code) | pairing `send_to` / `accept`→`receive(ticket)`  | ✅ (croc-code derivation removed; ticket in the signed offer) |
| `CrocService.CancelSend/CancelReceive`                    | `cancel_send` / `cancel_receive`                | ✅                                                            |
| `FileService.SelectFiles`                                 | frontend `@tauri-apps/plugin-dialog` `open()`   | ✅                                                            |
| `FileService.Describe`                                    | `describe`                                      | ✅                                                            |
| `FileService.OpenPath`                                    | `open_path` (`tauri-plugin-opener`)             | ✅                                                            |
| `PairingService.Identity`                                 | `identity`                                      | ✅                                                            |
| `PairingService.PreviewPairing`                           | `preview_pairing`                               | ✅                                                            |
| `PairingService.Trust/Untrust`                            | `trust` / `untrust`                             | ✅                                                            |
| `PairingService.TrustedDevices`                           | `trusted_devices`                               | ✅                                                            |
| `PairingService.SendTo`                                   | `send_to`                                       | ✅                                                            |
| `PairingService.Accept/Decline`                           | `accept` / `decline`                            | ✅                                                            |
| —                                                         | `create_pair_link` / `open_pair_link`           | ➕ new (one-sided pairing)                                    |

## Events (Go → Tauri, typed via tauri-specta)

| Go                                          | Tauri                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `croc:code`                                 | `code-event`                                                                      |
| `croc:send:progress` / `croc:recv:progress` | `progress-event` (one struct, `kind`)                                             |
| `croc:sent` / `croc:received`               | `done-event` (one struct, `kind`)                                                 |
| `croc:error`                                | `error-event`                                                                     |
| `files-dropped`                             | native webview drag-drop (no app event)                                           |
| `pairing:offer/accepted/declined/error`     | `pairing-offer-event` / `pairing-accepted` / `pairing-declined` / `pairing-error` |
| —                                           | `pairing-paired` (one-sided), `deep-link` (`floppy://receive`) — ➕ new           |

## Transport behavior parity (croc → iroh)

- Send/receive, live progress, cancel (emits nothing), one-send+one-receive concurrency with a stable busy error, resume-by-content: ✅. The croc `Snapshot()` data-race fence is gone — iroh has a native progress stream.
- Friendly error mapping (sentinels + classified transfer errors): ✅.

## Added beyond the Go build

- **One-sided pairing** — link/QR; the other device opens it and both trust each other (Go required both sides to add each other manually).
- **Deep links** (`floppy://receive?code=…`, `floppy://pair/…`) — the Go build only had an exploration note.
- **Completion notifications** — was an unmerged Go change (`transfer-complete-notifications`); shipped here.

## Known minor differences

- **Graceful shutdown on quit.** The Go `Manager.Shutdown` aborted in-flight transfers and waited briefly for the unwind. The Tauri build relies on process exit (iroh unwinds; partial files remain as resume state). Low impact; revisit if a clean-quit hook is wanted.
- **Custom send codes.** Neither build exposes `SendOptions.Code` in the UI (Go had it at the API level only). Parity.
- **Broker not yet deployed.** Quick-share/trusted work against a local `./broker`; deploy + relay-strategy decision are tracked in the `release-hardening` change.
