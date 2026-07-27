# Tasks: transfer-complete-notifications

## 1. Byte formatting

- [ ] 1.1 Add `internal/services/format.go` with unexported `formatBytes(int64) string` — Go port of the decimal formatter in `frontend/src/lib/components/transfer/format.ts`, output parity ("412 MB")
- [ ] 1.2 Add `internal/services/format_test.go` table test mirroring format.ts cases (0 B, 999 B, 1 kB, 412 MB, GB boundary)

## 2. NotifyService

- [ ] 2.1 Extract the body of `FileService.OpenPath` (fileservice.go:102-127) into unexported `openPath(path string) error`; make `OpenPath` delegate to it
- [ ] 2.2 Add `internal/services/notifyservice.go`: `Notifier` interface (`Notify(id, title string, data map[string]any)`) and `NotifyService` wrapping `notifications.New()`
- [ ] 2.3 `ServiceStartup`: delegate to wrapped service; on error log warning, mark unavailable, return nil (macOS unbundled dev builds must not abort the app); when available, register `OnNotificationResponse` and request authorization in a goroutine storing the grant in an `atomic.Bool`
- [ ] 2.4 `Notify`: no-op when unavailable/denied; otherwise `SendNotification` with `Sound` nil (platform default sound), log send errors; `ServiceShutdown` delegates without waiting on the authorization goroutine
- [ ] 2.5 Response handler: `UserInfo["dest"].(string)` → injected `open func(string) error` field (defaults to `openPath`); ignore responses with error or missing dest
- [ ] 2.6 Add `internal/services/notifyservice_test.go`: response routing with fake `open` — dest present → opened; missing dest / error result → not opened; unavailable service `Notify` is a no-op

## 3. Dispatch in CrocService

- [ ] 3.1 Add to `CrocService`: `notify Notifier`, `focused func() bool`, mutex-guarded `map[transfer.Kind]lastProgress{id string; stats transfer.Stats}`; `EnableNotifications(n Notifier, focused func() bool)` wiring method
- [ ] 3.2 In `forward`: on `EventProgress` store `{ev.ID, *ev.Stats}` under `ev.Kind`; on `EventFailed` clear the entry
- [ ] 3.3 In `forward` on `EventDone`: take entry (ID must match, else treat as no stats); when `notify != nil && focused != nil && !focused()` send notification — send: `"Sent " + formatBytes(stats.Total)` (fallback `"Send complete"`); receive: `"Received N files"` with singular "1 file" (fallback `"Receive complete"`), `Data{"dest": ev.Dest}`
- [ ] 3.4 Extend `crocservice_test.go`: fake notifier + focused stub — unfocused send progress→done yields "Sent 412 MB"; receive with FileCount 3 and Dest yields "Received 3 files" + dest in data; focused → no notify; `EventFailed` → no notify; done without/mismatched stats → fallback titles; nil notifier → existing `TestForwardMapping` stays green unchanged

## 4. Wiring

- [ ] 4.1 `main.go`: construct `CrocService` and `NotifyService` explicitly, add `NotifyService` to the `Services` slice (after `stdio.SilenceUnusableStderr` init ordering is untouched)
- [ ] 4.2 `main.go`: after window creation wire `events.Common.WindowFocus` / `WindowLostFocus` into an `atomic.Bool` (initial true) and call `croc.EnableNotifications(notify, focused.Load)` before `app.Run()`

## 5. Verification

- [ ] 5.1 `go test -race ./...` green — no OS notifications or network in tests (never construct the real notifications service in tests)
- [ ] 5.2 Manual, dev build (`wails3 dev` on macOS): app starts with degrade warning, transfers unaffected
- [ ] 5.3 Manual, packaged build (`wails3 package`): background the window, complete a send and a receive — notification + default sound for each; clicking the receive notification opens `~/Downloads/<code>/`; focused completions stay silent
