# Design: Android port

## Context

Desktop parity is done (`tauri-iroh-migration`, slices 1–5). The transport
(iroh), rendezvous (broker mailbox + SPAKE2), and pairing (Ed25519/X25519) layers
are pure Rust with no desktop assumptions and cross-compile as-is — the smoke run
proves it: `cargo` produces a working `libfloppy_lib.so` and Gradle packages it.
Everything that breaks lives in the thin shell between those cores and the OS.

That shell is where this design puts its seams, so `ios-port` becomes
configuration and verification rather than a second implementation.

## The three shims

```
                    frontend picks files
                            │
                  ┌─────────┴──────────┐
                  ▼                    ▼
          "content://…"           "/var/…/file.jpg"
                  │                    │
                  └────────┬───────────┘
                           ▼
              ┌────────────────────────────┐
              │  resolve_input_path()      │
              │  · plain path → passthru   │
              │  · uri → fs().open() → fd  │
              │    stream-copy to cache    │
              │  · name/size via resolver  │
              └────────────┬───────────────┘
                           ▼
                  real path in sandbox
                  │        │         │
             describe   add_path   thumb://
              (queue)    (iroh)   (preview)
```

1. **`resolve_input_path()`** — the only place that knows a picked file may not be
   a filesystem path. Everything downstream keeps taking a plain path.
2. **Platform directories** — one call site for the destination root and the blob
   store, resolved through Tauri's path API rather than `dirs`.
3. **`foreground()`** — one predicate the notification gate asks, instead of
   `is_focused()`.

## Decisions

### D1. `tauri-plugin-fs` for URI resolution, not a hand-rolled plugin

`fs().open(FilePath, OpenOptions) -> std::fs::File` already does the platform
work: `content://` through `ContentResolver.openAssetFileDescriptor` on Android,
`startAccessingSecurityScopedResource` on iOS, plain `open` on desktop. One
dependency replaces Kotlin **and** Swift glue we would otherwise own.

**Alternative rejected:** resolving in the frontend with `@tauri-apps/plugin-fs`
(`readFile` → `writeFile`). It pulls the whole file through JS memory — fatal for
a phone video.

### D2. Materialize a sandbox copy; do not try to stream into iroh

iroh-blobs 0.103 exposes `add_slice`, `add_bytes`, and `add_path`. There is no
reader/stream import, and `add_bytes` means the whole file in RAM. So a picked
`content://` file must become a real path before it can be sent.

Consequence: a send from Android transiently costs 2× the file size (cache copy +
blob store). Mitigated by reaping cache copies when the queue clears, and by
preferring `ImportMode::TryReference` for the blob import where the store
supports it. Documented, not hidden.

**Note the asymmetry:** iOS needs no copy of its own. The dialog plugin uses
`UIDocumentPickerViewController(asCopy: true)` and the photo picker copies into a
temp directory, so iOS already hands back a real `file://` inside the sandbox.
`resolve_input_path()` is a passthrough there — the shim exists so that stays
true without a second code path.

### D3. Broker URL baked at compile time, env override kept

`std::env::var("FLOPPY_BROKER_URL")` works under `mise` on a dev machine and
never on a phone, where it silently falls back to `ws://127.0.0.1:8787/ws` —
quick share and pairing would both fail with a confusing connection error rather
than an obvious misconfiguration. Compile-time `option_env!` with the deployed
default, runtime env still consulted first so `FLOPPY_BROKER=local` keeps working
for desktop dev.

This overlaps `release-hardening` 1.2 (point the default at the deployed broker);
whichever lands first satisfies both.

### D4. Foreground, not focus

`is_focused()` describes a desktop window. On Android a backgrounded activity is
not an "unfocused window", and the existing call already has to be marshalled
onto the main thread because it blocks on the UI event loop (see
`tauri-notification-gotchas`). The predicate becomes a plain flag maintained from
the app's lifecycle/focus events, which is cheap to read from a transport task
and means the same thing on all three platforms.

### D5. Preview budgets keyed to platform, not measured at runtime

`THUMB_MAX_SOURCE_PIXELS` drops for mobile with decode concurrency pinned to 1.
Runtime memory probing is more precise and not worth it — the failure mode is a
missing thumbnail, and the gate already falls through to streaming the original.

## Risks

| Risk                                                        | Handling                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| iroh's UDP/QUIC path behaves differently under emulator NAT | Verify on a real device, not just the emulator; relay path is the fallback                        |
| A transfer dies when the user backgrounds the app           | Out of scope by decision; documented as a known limit and verified as a clean failure, not a hang |
| 2× storage for a large Android send                         | Cache reaping + `TryReference`; surfaced in the proposal                                          |
| `gen/android` is partly generated and partly tracked        | Only hand-edit files git already tracks; regenerate the rest                                      |

## Open questions

- Does the emulator's NAT allow a direct path, or does every emulator transfer go
  via relay? Affects how much a green emulator run actually proves.
- Is `ImportMode::TryReference` honoured by the fs blob store for a cache-dir
  path, or does iroh copy regardless?
