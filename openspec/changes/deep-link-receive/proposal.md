# Deep-link receive (`floppy://`)

> **Status: exploration only.** Feasibility was investigated on 2026-07-27; no implementation
> is scheduled. This change exists to preserve the findings (see `design.md`).

## Why

Receiving a file today requires the recipient to open the app, switch to the receive panel,
and type or paste the code phrase. A shareable link (`floppy://receive?code=...`) collapses
that to one click: the OS launches (or focuses) Floppy, the receive panel opens with the code
prefilled, and one click starts the transfer. This is the single biggest UX win available for
the receive flow, and everything it needs already exists in the pinned Wails version
(v3.0.0-alpha2.117) — custom protocol registration, launch-URL events, and single-instance
forwarding.

## What Changes

- Register a `floppy://` custom URL scheme via `protocols:` in `build/config.yml`
  (Wails generates the macOS `Info.plist` entry, Linux `.desktop` handler, and NSIS registry entry).
- Add `SingleInstance` options to `main.go` — required so a link click on Windows/Linux
  focuses the running app instead of spawning a second instance.
- Handle `events.Common.ApplicationLaunchedWithUrl` (cold start + macOS warm start) and
  `OnSecondInstanceLaunch` (Windows/Linux warm start) in Go; buffer the URL until the
  frontend is ready, then emit a new `croc:deeplink` event.
- Frontend: on `croc:deeplink`, switch to the receive panel and prefill the code —
  following the existing clipboard auto-fill rules (visible provenance, never auto-start,
  one-click undo).
- Sender side: a "copy link" affordance next to the code phrase on the send panel.
- Out of scope for a first phase: an HTTPS wrapper page (needed for links to be clickable
  in chat apps — see design.md), auto-starting the receive on click (rejected: drive-by
  download risk).

## Capabilities

### New Capabilities

- `deep-link-receive` — the app registers `floppy://`, and an incoming link routes to the
  receive panel with the code prefilled but not started.

### Modified Capabilities

<!-- none — existing receive behaviour is unchanged; the link is an additional entry path -->

## Impact

- `build/config.yml` + regenerated build assets (`wails3 task common:update:build-assets`).
- `main.go`: `SingleInstance` options, launch-URL event wiring.
- `internal/services/`: new `croc:deeplink` event + payload type in `RegisterEvents`.
- `frontend/`: `transfer-app.svelte.ts` (mode switch + prefill), `SendPanel.svelte` (copy link).
- Distribution: Windows scheme registration only happens through the NSIS installer —
  a portable exe needs first-run self-registration or stays link-less.
