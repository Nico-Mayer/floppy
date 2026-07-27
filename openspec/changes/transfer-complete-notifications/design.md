# Design: transfer-complete-notifications

## Context

Transfer completion currently surfaces only inside the app: `Manager` emits a final 100% `EventProgress` followed by `EventDone` (manager.go:280-283, done guaranteed last; `Dest` set for receives only), and `CrocService.forward` (crocservice.go:114-119) translates that to `croc:sent` / `croc:received` for the frontend. When the window is backgrounded during a long transfer, nothing tells the user it finished.

Wails v3.0.0-alpha2.117 (already in go.mod) ships `pkg/services/notifications` with darwin/windows/linux/ios implementations. Verified against the module cache:

- `notifications.New()` (singleton), `RequestNotificationAuthorization() (bool, error)` — real UNUserNotificationCenter prompt on macOS (blocks up to 180s); windows/linux stubs return `(true, nil)`.
- `SendNotification(NotificationOptions{ID, Title, Body, Data, Sound})` — `Sound: nil` means platform default sound; `ID` and `Title` must be non-empty.
- `OnNotificationResponse(cb)` — plain click arrives as `ActionIdentifier == "DEFAULT_ACTION"`; `Data` round-trips into `Response.UserInfo` on all three desktop platforms. No `CategoryID`/actions needed for click handling.
- **macOS caveat**: unbundled binaries (dev mode) fail `ServiceStartup` with "notifications require a valid bundle identifier", and Wails aborts the whole app on any service startup error.

Constraints: `internal/transfer` must stay Wails-free (injected `Emitter`); `go test -race ./...` must stay green with no OS notifications or network in CI; `DoneEvent` carries no stats — bytes/file-count live in the guaranteed final `ProgressEvent` (`transfer.Stats{Total, FileCount, ...}`).

## Goals / Non-Goals

**Goals:**
- OS notification with platform default sound when a send or receive completes while the window is unfocused: "Sent 412 MB" / "Received 3 files".
- Clicking a receive notification opens the destination folder.
- App keeps working (silently) wherever OS notifications are unavailable — especially macOS unbundled dev builds.
- All new logic unit-testable under `go test -race ./...` via injected fakes.

**Non-Goals:**
- Error/cancel notifications (errors show in-app; cancelled transfers emit no terminal event).
- Custom sounds or frontend audio assets — the OS notification carries the sound.
- In-app notification settings/toggle.
- Minimum-duration threshold — focus is the only gate; a short backgrounded transfer still notifies.
- Mobile implementations (see seams below).

## Decisions

### 1. New `NotifyService` wrapper in `internal/services/notifyservice.go`

Wrap `*notifications.NotificationService` instead of registering it directly in the Services slice.

- `ServiceStartup`: delegate to the wrapped service; on error `slog.Warn`, mark unavailable, **return nil** — registering the Wails service directly would abort `wails3 dev` on macOS (bundle-identifier failure). If available: register `OnNotificationResponse`, then request authorization in a goroutine (the macOS prompt blocks up to 180s), storing the grant in an `atomic.Bool`.
- `Notify(id, title string, data map[string]any)`: no-op when unavailable/denied; otherwise `SendNotification` with `Sound` nil (platform default), logging errors.
- Response handler: `result.Response.UserInfo["dest"].(string)` → open the folder.
- `ServiceShutdown`: delegate if started; never block on the authorization goroutine.

*Alternative rejected*: registering `notifications.New()` directly — breaks dev mode on macOS and is untestable.

### 2. Dispatch lives in `CrocService.forward`

`forward` already sees every `transfer.Event` and is the only place with both the done event and (just before it) the final stats.

- Small `Notifier` interface in `internal/services`; `CrocService` holds `notify Notifier`, `focused func() bool`, and a mutex-guarded `map[transfer.Kind]lastProgress{id, stats}` (bounded at 2 — the Manager allows one live transfer per kind; a stale entry from a cancelled transfer is overwritten by the next transfer of that kind, and `EventDone` checks the stored ID matches).
- `EventProgress` stores `{ev.ID, *ev.Stats}` under `ev.Kind`. `EventDone` takes the entry; if `notify != nil && focused != nil && !focused()`:
  - send: title `"Sent " + formatBytes(stats.Total)`; fallback `"Send complete"` when stats are missing/mismatched (`finalStats` can return `!ok`).
  - receive: `"Received N files"` (singular "1 file") from `stats.FileCount`; fallback `"Receive complete"`; `Data{"dest": ev.Dest}`.
- `EventFailed` clears the entry and never notifies. Cancelled transfers emit no terminal event, so they never notify.
- Wiring via `CrocService.EnableNotifications(n Notifier, focused func() bool)` called from `main` before `app.Run()` — race-free because `forward` only runs once transfers start; nil notifier preserves existing behavior exactly.

*Alternative rejected*: extending `transfer.Event`/`DoneEvent` with stats — touches the transfer core and the frontend event contract for data the service layer already receives.

### 3. Focus tracking: window events into an `atomic.Bool`

`main.go` wires `events.Common.WindowFocus` / `WindowLostFocus` (mapped on darwin/windows/linux in `pkg/events/defaults.go`) into an `atomic.Bool` (initial `true`) and passes `focused.Load` to `EnableNotifications`.

*Alternative rejected*: `win.IsFocused()` — it round-trips through the main thread (`InvokeSyncWithResult`) and would block the transfer goroutine calling `forward`.

### 4. Click-to-open reuses `OpenPath` via extraction

Extract the body of `FileService.OpenPath` (fileservice.go:102-127 — stat-guard, `open`/`explorer`/`xdg-open`, reap launcher) into an unexported package func `openPath(path string) error`; `FileService.OpenPath` delegates to it. `NotifyService` holds it as an injected field (`open func(string) error`) so tests fake it.

### 5. Byte formatting: small Go port of `format.ts`

No Go formatter exists in the repo; `go-humanize` is only an indirect dependency. Port the decimal `formatBytes` from `frontend/src/lib/components/transfer/format.ts` (~10 lines) into `internal/services/format.go`, keeping output parity ("412 MB") so the notification matches the in-app numbers.

### Future mobile seams (out of scope, kept viable)

Wails ships `notifications_ios.go` (same UNUserNotificationCenter path); Android has no impl yet. The seams that make mobile a wiring-only change later: the `Notifier` interface (inject a different impl or nothing), the degrade-on-startup-failure path, `focused func() bool` (swap window focus for app-lifecycle foreground state), and the injected `openPath` (iOS sandbox needs Files-app handoff instead of `open`).

## Risks / Trade-offs

- [macOS dev builds show no notifications — bundle-ID requirement] → degrade to a logged warning, app starts normally; manual verification requires `wails3 package`.
- [User denies notification authorization] → silent no-op by design (`atomic.Bool` gate); no re-prompt.
- [Linux notification daemons that ignore actions] → notification still shows; click may not open the folder.
- [Final stats missing (`finalStats` returns `!ok`) or stale entry from a cancelled transfer] → ID check + fallback titles ("Send complete" / "Receive complete"), covered by unit tests.
- [Authorization goroutine may outlive shutdown (180s macOS timeout)] → harmless; `ServiceShutdown` never waits on it.

## Migration Plan

Additive only — no event contract, sentinel error, or frontend changes. Rollback = remove the wiring in `main.go` (nil notifier restores exact current behavior).

## Open Questions

None — API surface verified against the module cache.
