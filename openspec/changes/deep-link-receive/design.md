# Design notes — deep-link receive

> Findings from the 2026-07-27 feasibility exploration. Verified against the pinned
> Wails version `v3.0.0-alpha2.117` (checked in the module cache source, not just docs).

## Flow

```
 sender floppy                    receiver machine
 ┌────────────┐                   ┌──────────────────────────────┐
 │ code screen │  link via chat   │ click floppy://receive?code=…│
 │ [copy link] │ ───────────────▶ │                              │
 └────────────┘                   │  app not running:            │
                                  │   OS launches app,           │
                                  │   ApplicationLaunchedWithUrl │
                                  │  app running:                │
                                  │   mac: Apple event → same evt│
                                  │   win/linux: 2nd instance →  │
                                  │   OnSecondInstanceLaunch,    │
                                  │   URL in data.Args           │
                                  │        │                     │
                                  │        ▼                     │
                                  │  Go emits croc:deeplink      │
                                  │        ▼                     │
                                  │  UI → receive panel,         │
                                  │  code prefilled, 1 click     │
                                  └──────────────────────────────┘
```

## What Wails alpha2.117 provides (all confirmed in source)

| Piece                   | Where                                                                   | Notes                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocols:` config key | `internal/commands/build-assets.go` (`ProtocolConfig`)                  | Sits next to the existing commented `fileAssociations` in `build/config.yml`; regenerate with `wails3 task common:update:build-assets`                                      |
| macOS registration      | `Info.plist.tmpl` → `CFBundleURLTypes`                                  | Generated from `protocols:`                                                                                                                                                 |
| Linux registration      | `desktop.tmpl` → `MimeType=x-scheme-handler/<scheme>;`                  | Generated from `protocols:`                                                                                                                                                 |
| Windows registration    | NSIS installer template                                                 | **Installer-only** — a portable exe never registers the scheme                                                                                                              |
| Launch event            | `events.Common.ApplicationLaunchedWithUrl`, URL via `e.Context().URL()` | macOS: Apple event (`HandleOpenURL` in `application_darwin.go`), fires warm _and_ cold. Windows: `os.Args` scan at startup (`application_windows.go:161`) — cold start only |
| Warm start on Win/Linux | `SingleInstanceOptions{UniqueID, OnSecondInstanceLaunch}`               | URL arrives in `SecondInstanceData.Args`. `main.go` currently sets **no** SingleInstance options — without them a link click spawns a second window                         |

Canonical reference: `examples/single-instance-url-scheme/` in the Wails repo shows the
exact two-listener pattern (launch event + second-instance callback).

## Landmines

1. **wails#5089** — macOS single-instance lock used to swallow URL-scheme launches (second
   process exited before the Apple event handler installed; URL lost). Issue is CLOSED, but
   the repro example still ships in alpha2.117 with "observed (bug)" comments.
   **Spike before building:** tiny test app at our pinned version, verify the URL arrives
   warm + cold on macOS. Cheap, de-risks the whole feature.
2. **Cold-start race** — on Windows the launch-URL event is emitted during startup, before
   the webview exists or frontend listeners are registered. The Go side must buffer the
   pending URL and deliver it once the frontend is ready (frontend pulls on mount, or the
   service re-emits on a ready signal). Same discipline as the existing "done event is
   guaranteed last" rule in the transfer core.
3. **Chat apps don't linkify custom schemes** — Slack/WhatsApp/Discord render
   `floppy://receive?code=…` as dead text. Real click-through in chat needs an HTTPS
   wrapper page (e.g. GitHub Pages: `https://<user>.github.io/floppy/r#<code>`) that
   redirects to `floppy://` and shows install instructions as fallback. Use a URL
   _fragment_ for the code — fragments are not sent to the server, so codes stay out of
   server logs. Phase 2; the raw scheme is still useful on its own (address bar, `open`
   command, QR via the existing `spell/qrcode` component).
4. **Windows portable exe** — no installer means no registry entry. Options: ship NSIS
   installer only, or write `HKCU\Software\Classes\floppy` on first run.

## Decisions taken during exploration

- **Never auto-start the receive from a link.** Clicking a link must not write files to
  disk (drive-by download). Prefill + focus + one explicit click. This mirrors the existing
  clipboard auto-fill rules in `ReceivePanel.svelte`: visible provenance, one-click undo.
- **Validate the code from the URL** against the same croc-shaped check the clipboard path
  uses; reject junk before it reaches `Receive` (`ErrBadCode` already exists as a sentinel).
- Link format leaning: `floppy://receive?code=<code>` (flat query, trivial to parse) over
  path-style `floppy://r/<code>`. Not final.

## Open questions

1. HTTPS wrapper page in phase 1 or phase 2? (Determines whether "click in chat" works at all.)
2. Windows: installer-only, or first-run self-registration?
3. Exact link/scheme format.
