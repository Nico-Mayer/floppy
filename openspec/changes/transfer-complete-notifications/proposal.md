# Transfer Complete Notifications

## Why

Long transfers mean the floppy window is backgrounded — the user has no way to know a send or receive finished without switching back. A desktop notification with sound ("Sent 412 MB" / "Received 3 files") tells them the moment it's done, and clicking the receive notification opens the destination folder. High satisfaction, low effort: Wails v3 ships a notifications service and the app already has `FileService.OpenPath`.

## What Changes

- Add the Wails v3 notifications service (`pkg/services/notifications`) to the app's service list in `main.go`.
- On `croc:sent` / `croc:received` (transfer done), fire an OS notification with a completion summary:
  - Send: "Sent 412 MB" (bytes from the final progress stats).
  - Receive: "Received 3 files" (file count from the final progress stats), with the destination folder attached.
- Notification plays the platform default notification sound (carried by the OS notification itself — no audio assets in the frontend).
- Clicking a receive notification opens the destination folder (`DoneEvent.Dest` → same path handling as `FileService.OpenPath`).
- Notifications only fire when the window is not focused — a user watching the app doesn't need an OS popup.
- Extend `DoneEvent` (or capture the guaranteed final 100% `ProgressEvent`) so completion has bytes/file-count available for the notification body.
- Errors do not notify in this change; cancelled transfers emit no terminal event and therefore never notify.

## Capabilities

### New Capabilities

- `transfer-notifications`: OS desktop notification (with sound) when a send or receive completes while the app is backgrounded; receive notifications open the destination folder on click.

### Modified Capabilities

<!-- none — existing specs (receive-clipboard-detect, transfer-panel-layout) have no requirement changes -->

## Impact

- `main.go`: register the notifications service; request notification authorization at startup (macOS requires it).
- `internal/services/crocservice.go`: completion path grows notification dispatch; needs the last stats snapshot per transfer (Manager already emits a final 100% stat immediately before done, and the done event is guaranteed last).
- `internal/transfer/`: no croc-facing changes; at most a richer `Event`/`DoneEvent` payload. `Emitter` boundary stays — no Wails imports in `transfer`.
- Window focus state: needs a way to know whether the app window is focused (Wails window events) so foreground completions stay silent.
- Dependency: `github.com/wailsapp/wails/v3/pkg/services/notifications` (already in module cache at v3.0.0-alpha2.117; darwin/windows/linux impls present).
- Tests: `go test -race ./...` must stay green; notification dispatch must be injectable/fake-able since OS notifications can't run in CI.
