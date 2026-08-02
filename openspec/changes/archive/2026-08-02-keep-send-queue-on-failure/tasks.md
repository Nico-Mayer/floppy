## 1. A send exit that keeps the queue

- [x] 1.1 Add `stop()` to `SendTransfer` in `src/lib/transfer-app.svelte.ts`: `#clearTransfer()`
      only, with a doc comment saying it gives up on this attempt and keeps the queue, mirroring
      `ReceiveTransfer.stop()`.
- [x] 1.2 Update `reset()`'s doc comment: its callers are now the done screen's "Send something
      else" and nothing else, so the note about "two trusted-send failure paths" is stale.

## 2. Trusted-send failures stop emptying the queue

- [x] 2.1 `src/lib/pairing-app.svelte.ts`, `pairing:error` handler: swap `app.send.reset()` for
      `app.send.stop()`, keeping the `status === 'starting'` guard and the inline error that
      follows it. This is the offline case the change is for.
- [x] 2.2 `sendTo()`'s catch: swap `app.send.reset()` for `app.send.stop()`, keeping
      `describeError(e, 'send')` after it.
- [x] 2.3 `#resetPendingSend()` (the `pairing:declined` path): swap `app.send.reset()` for
      `app.send.stop()` and refresh its comment, which currently explains a reset.
- [x] 2.4 Re-read the three sites together and confirm nothing else in the file empties the queue,
      and that no path now clears the input cache while entries still point into it.

## 3. Verify

- [x] 3.1 `npm run check` and `npm run lint` clean.
- [x] 3.2 Desktop, offline target: pair two devices, quit the app on one, queue several files and
      send to it. The Send screen shows the failure inline, returns to idle, and the queue and the
      chosen target are exactly as they were.
- [x] 3.3 Desktop, declined: send to a live paired device and turn it down there. Same result, and
      the toast still says they turned it down.
- [x] 3.4 Desktop, retry: after 3.2, bring the other device back and press Send again with no
      re-picking. The transfer completes.
- [x] 3.5 Phone build (iOS or Android): pick photos so the queue holds sandbox copies, send to an
      offline device, then retry once it is back. The retry sends the same files, proving the
      copies were not reaped.
- [x] 3.6 Regression: "Send something else" on the done screen still empties the queue, and a
      cancelled send still keeps it.

## 4. Specs

- [x] 4.1 `openspec validate keep-send-queue-on-failure --strict` passes.
- [x] 4.2 After the on-device checks pass, sync the deltas into `openspec/specs/` and archive.
