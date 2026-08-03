## Why

The pre-transfer screens for a trusted-device transfer say too much and show too little. A send sits
on "Waiting for a yes" under an anonymous laptop mark, with two lines explaining that the other device
has to say yes, then swaps the whole card for "They said yes" and two more lines about files moving on
their own, for about a second, before progress takes over.

The swap is literally a remount: `SendPanel.svelte:81-92` renders the same `SendDevice` component from
two sibling branches (`starting` and `waiting`), so Svelte destroys and recreates it when the accept
lands. The entrance fade and the `animate-pop` headline both replay and the card re-lays-out. That
flash is what reads as a glitch, not the copy.

The laptop mark is not carrying any information either. It never changes, so it says nothing about
what is happening, and the sentences underneath are left to do all the work.

The receive side has the same shape and the same static mark, so both need the same treatment or they
drift apart.

## What Changes

- One view replaces the two device pre-transfer screens. It stays mounted across the accept, so
  nothing re-enters and nothing re-lays-out.
- **The mark becomes the status.** The static laptop is replaced by a spinner while the transfer is
  still being arranged, which becomes a check the moment the other device says yes. Same fixed frame,
  so the swap moves nothing.
- **One short label beneath it, naming the device**: `waiting for MacBook` → `connecting to MacBook`.
  The explanatory sentences go away. The mark says what state we are in and the label says who with.
- After 15 seconds still waiting on a yes, a second quiet line appears with the one thing to check. A
  trusted send otherwise gives no sign that nothing is coming.
- The connecting screen and the completion screen become **one component**, `StatusHero`, since they
  were already the same surface with a different mark in it. It takes a mark (`pending` | `success`)
  and up to three text rows, each optional: a bold title for a flow that ended, a quiet label, and the
  late-arriving hint. The completion screen picks up the bigger mark along the way.
- `DeviceGlyph.svelte`, `SendDevice.svelte`, `ReceiveDevice.svelte` and `TransferComplete.svelte` are
  all deleted in favour of it.
- Connection and progress stay two screens. This view hands off to the existing gauge at the first
  progress report and carries no gauge or byte figure of its own.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `transfer-panel-layout`: the pre-transfer screens for a device target become one view that spans the
  wait and the answer without remounting, where the mark carries the state and one label names the
  device; a long wait on a yes gains a hint.

## Impact

Frontend only, and smaller than what it deletes. No Rust, no IPC, no broker, no new dependency:
`PairingAccepted` and the existing send/receive statuses already carry every phase this view renders.

- `src/lib/components/feedback/StatusHero.svelte` — new, and the only screen in this family.
- `src/lib/components/transfer/send/SendDevice.svelte`, `receive/ReceiveDevice.svelte`,
  `DeviceGlyph.svelte`, `feedback/TransferComplete.svelte` — all deleted, replaced by it.
- `src/lib/components/transfer/send/SendPanel.svelte` — the `starting`/`waiting` branches for a device
  target collapse into one, which is what stops the remount. `ReceivePanel.svelte` follows.
- `src/lib/components/transfer/send/labels.ts`, `receive/labels.ts` — the new label copy joins the
  state table that already lives there.
- `src/lib/transfer-app.svelte.ts` — `SendTransfer` gains the long-wait flag and timer, mirroring
  `ReceiveTransfer`'s existing `tooSlow`.
- No change to the shared pending primitive or the gauge. The completion screen keeps its copy and its
  actions; only its mark grows and its element changes.
