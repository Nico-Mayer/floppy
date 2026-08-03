## Context

`SendTransfer` (`src/lib/transfer-app.svelte.ts`) has two ways to leave a transfer:

- `#clearTransfer()` — code, target, progress, stats, status back to idle. The queue stays. This is
  what `cancel()` uses, and its comment already says why: "cancelling means 'not now', and picking
  the same files again by hand is the tedious part."
- `reset()` — `#clearTransfer()` plus emptying `files` and calling `ClearInputCache()`, which
  deletes the sandbox copies a mobile pick made. Destructive on purpose: it is the done screen's
  "Send more files".

Three trusted-send failure paths in `src/lib/pairing-app.svelte.ts` call the destructive one:

- line 117, `pairing:error` while `send.status === 'starting'` — this is the offline case. The core
  emits `PairingEvent::Error { message: "The device is offline." }` from the broker's `unreachable`
  frame (`src-tauri/src/pairing/service.rs:577`) after freeing the send it was holding.
- line 232, `sendTo()`'s catch — `send_to` refused before the offer went out (not trusted, busy,
  unwinding).
- line 297, `#resetPendingSend()`, from `pairing:declined` — they said no, or auto-declined as busy.

A code send has no equivalent: `start()`'s catch only sets `status = 'idle'`, and a mid-transfer
`ErrorEvent` likewise. So the queue's survival depends on which target the user happened to pick,
which is the inconsistency the user hit.

There is a second reason this is not a one-word edit. On a phone the queue entries point at sandbox
copies, and `reset()` reaps them. Dropping the `files = []` while keeping the `ClearInputCache()`
would leave a queue of entries pointing at deleted files: the panel would look right and the retry
would fail on read. Both halves have to go together.

## Goals / Non-Goals

**Goals:**

- One exit for "this send is over and it never sent", used by cancel and by all three failure paths.
- The queue and its sandbox copies survive every one of them.
- No change to the destructive exit or to who calls it.

**Non-Goals:**

- Any Rust, IPC, or broker change. The core already releases the send slot on all three paths.
- Retrying automatically, or holding the failed target for a retry button. The user presses Send
  again; the target picker already remembers who they picked (`send.picked` outlives a transfer).
- Reworking how the failure is worded or where it is shown. Inline in the Send panel is already
  right and already spec'd (`feedback`, "One surface per kind of failure").
- Touching the receive side. `ReceiveTransfer.stop()` already keeps the code for the same reason.

## Decisions

**Add `SendTransfer.stop()`, mirroring `ReceiveTransfer.stop()`.** The receive side already names
this exact idea — "give up on this attempt but keep the code around to be corrected" — so the send
side gets the same name for "give up on this attempt but keep the queue". It is `#clearTransfer()`
with a doc comment; `cancel()` keeps calling `#clearTransfer()` directly since it is already inside
the class.

Alternative considered: a `keepQueue` flag on `reset()`. Rejected — a boolean parameter at the call
site says nothing about why, and the risky half (`ClearInputCache`) would still be one wrong
argument away. Two named exits make the destructive one impossible to reach by accident, which is
what `reset()`'s own comment is anxious about ("Only ever call this when no send is serving").

**All three pairing paths call `stop()`.** They are the same event in three costumes: a send that
was offered and never became a transfer. `#resetPendingSend()` keeps its `status === 'starting'`
guard — once bytes are moving, the transfer's own events own the panel.

**The error is set after `stop()`, not by it.** `stop()` clears transfer state only; `error` is set
by the caller, which is what already happens and what keeps a failure visible across the return to
idle. The `pairing:error` path keeps its hand-written `{ title: 'Could not send', message }` and the
`sendTo` catch keeps `describeError(e, 'send')`.

**`ClearInputCache()` stays where it is.** Two callers, both of which genuinely finish with the
queue: `complete()` (delivered) and `reset()` (emptied). Nothing about the command changes; the
failure paths simply stop being callers of `reset()`.

**Leaving `errorEvent`'s send branch alone.** It sets `status = 'idle'` without clearing `code` or
`target`. Making it `stop()` would be tidier, but it is a mid-transfer failure rather than one of
the three "never sent" paths, and clearing the target under a done-adjacent state is a behaviour
change the user did not ask for. Noted, not done.

## Risks / Trade-offs

- **A failed send leaves the core holding the send slot, and the retry is refused as `busy` or
  `unwinding`.** → The core already cancels the send on both the `unreachable` and the `declined`
  paths (`Manager::cancel(Kind::Send)`), and a refused `send_to` never claimed it. If the retry does
  land during the unwind it fails with `unwinding`, whose copy already says "try again in a moment"
  — and now with the queue intact, that retry costs one tap instead of re-picking everything.
- **Sandbox copies now outlive a failed send, so a phone holds those bytes longer.** → That is the
  point: they are the retry. They are still reaped when the queue is emptied or the send completes,
  which is every way the queue actually ends.
- **The idle screen after a failure looks identical to the idle screen before the send, so the
  failure must carry the whole story.** → It does: the inline `TransferError` block above the panel
  persists until dismissed or until the next send clears it, and navigation marks the failed side.
