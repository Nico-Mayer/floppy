## Why

A send to a trusted device that never gets off the ground — the device is offline, it turns the
offer down, or the offer fails — throws away the whole file selection along with the transfer.
Every other dead end keeps it: cancelling a code send keeps the queue, cancelling a trusted send
keeps the queue, a code send that fails to start keeps the queue. So the one case where the user
did nothing wrong, and most wants to try again in a second, is the one case that makes them pick
every file over from scratch.

## What Changes

- A send that ends before it moved bytes SHALL leave the file selection alone, whoever the target
  was and however it ended: cancelled, declined, target offline, or failed to start.
- The three trusted-send failure paths (`pairing:error` while still waiting on a yes,
  `pairing:declined`, and a rejected `send_to` command) stop emptying the queue. They clear the
  transfer state only, exactly as cancel already does, and land back on the idle Send screen with
  the queue intact and the failure reported inline above it.
- Sandbox copies made for a mobile pick survive those paths too. Today the failure path reaps them
  as part of emptying the queue; keeping the queue without keeping its bytes would leave entries
  pointing at files that are gone, so the reap moves to only the two places that genuinely finish
  with the queue: emptying it, and a completed send.
- Emptying the queue by hand ("Send more files" on the done screen) is unchanged: it still
  clears the files and reaps the copies behind them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transfer-panel-layout`: a new requirement that the Send queue survives every way a send can end
  without sending, so failure and cancellation behave the same.
- `app-platform`: the sandbox-copy reaping rule currently exempts cancellation only; it is widened
  to cover any send that ends without sending, which is the same reason.

## Impact

- `src/lib/transfer-app.svelte.ts` — `SendTransfer` gains a "give up but keep the queue" exit,
  mirroring `ReceiveTransfer.stop()`. `reset()` stays as the destructive one, for the done screen.
- `src/lib/pairing-app.svelte.ts` — the three `app.send.reset()` calls in the trusted-send failure
  paths move to the new exit.
- No Rust, IPC, or broker change: the core already frees the send slot on all three paths
  (`Manager::cancel(Kind::Send)` on unreachable and on declined), and `clear_input_cache` keeps its
  current contract. Only the frontend decides when to call it.
