## Context

Both panels have a pre-transfer screen for a trusted device, and they are near-identical:
`SendDevice.svelte` and `ReceiveDevice.svelte` each render `DeviceGlyph` (one static laptop mark), a
bold headline, an explanatory sentence, and a `PendingHint`. The mark never changes, so it carries no
information and the sentences are left to do all the work.

The send version has two phases, and `SendPanel.svelte:81-92` renders them from two sibling branches:

```
{:else if send.status === 'starting'}   → <SendDevice accepted={false} />
{:else if send.status === 'waiting'}    → <SendDevice accepted={true} />
```

Same component, two block positions, so Svelte destroys and recreates it when `PairingAccepted` flips
the status. The `in:fade` and the `animate-pop` headline both replay and the card re-lays-out. That
flash is the awkwardness, not the wording.

The status vocabulary is already right and does not change: for a device target `starting` means
waiting on a yes and `waiting` means accepted-and-connecting (`transfer-app.svelte.ts:159-182`).
Nothing in Rust, the IPC contract, or the broker is involved.

Prior art pointed the same way. AirDrop, Quick Share and Nearby Share never give the accept its own
screen: one tile stays put and its label changes underneath while the mark around it fills or ticks.
None of them draw the sending device either, because the person already knows which device they are
holding. So the minimal version of this screen is one mark and one line.

## Goals / Non-Goals

**Goals:**

- One view for a device transfer's whole pre-transfer life, mounted once, on both panels.
- Make the mark do the explaining: spinner while it is being arranged, check when the answer lands.
- One label, naming the device, nothing else. Delete the four lines of explanation.
- Explain a long silence on a send instead of spinning forever.
- Reuse the completion screen's own primitives so this is not a new kind of surface.

**Non-Goals:**

- Any illustration of the devices, or a beam between them. Considered and dropped: the second mark is
  the device you are holding, which is the one fact the user already has.
- Carrying the connection view into the transfer itself. Connection and progress stay two screens and
  the one-gauge requirement in `transfer-panel-layout` is untouched.
- Any change to the code-target screens (getting ready, then the code and QR).
- Any change to `PendingHint`, the gauge, or `TransferComplete`.
- Recalling an offer. Cancel still only stops us waiting; see the note at `SendPanel.svelte:176`.

## Decisions

### The view is `TransferComplete`'s skeleton with a swappable mark

`TransferComplete.svelte` is already `Empty.Root` → `Empty.Media variant="icon"` (a fixed `size-10`
`rounded-xl` frame holding a `size-5` glyph) → `Empty.Title` → optional `Empty.Description`. The
connecting view is the same skeleton with a different glyph in the frame:

```
┌──────────── card ─────────────┐        ┌──────────── card ─────────────┐
│                               │        │                               │
│            ╭───╮              │        │            ╭───╮              │
│            │ ⟳ │              │   →    │            │ ✓ │              │
│            ╰───╯              │        │            ╰───╯              │
│      waiting for MacBook      │        │    connecting to MacBook      │
│                               │        │                               │
├────────── [ Cancel ] ─────────┤        ├────────── [ Cancel ] ─────────┤
```

The frame is why the swap is free: `Empty.Media variant="icon"` is a fixed box and both glyphs are
`size-5` inside it, so nothing measures differently before and after. The check enters with
`animate-pop`, the same class `TransferComplete` uses, so the success vocabulary is shared rather than
re-invented. The spinner is the shared `Spinner`, which already names its sizes.

Alternative considered: extending `PendingHint` with a done state. Rejected — `PendingHint` is the
small inline "still working" report used in six places, and this is the hero of an otherwise empty
card. Widening it would make every existing caller carry a state it has no use for.

### One component, `direction` prop, for both panels

`SendDevice.svelte` and `ReceiveDevice.svelte` collapse into one
`src/lib/components/transfer/DeviceConnect.svelte`:

```
answered: boolean      // the other device said yes (always false on a receive)
label: string          // "waiting for MacBook" / "connecting to MacBook"
hint?: string          // the long-wait line, send only
```

No `direction` prop is needed once the copy lives in the panels' label tables: the only real
difference between the two sides is which words the panel passes in, and whether `answered` can ever
become true.

`DeviceGlyph.svelte` is deleted. It has no other caller, and leaving it would leave a static mark
available to the next screen that needs one.

### The check means an answer arrived, so a receive never shows one

On a send the check marks the moment `PairingAccepted` lands, alongside the `haptics.peerAccepted()`
that already fires there. A receive was accepted on this device before the view ever mounted, so there
is no moment for a check to mark; opening on one would be a success mark for something that did not
just happen. Its mark stays the spinner until progress takes over.

Alternative considered: a check from mount on a receive, for symmetry. Rejected — symmetry of the
*component* is what keeps the two sides from drifting, and that is preserved. Symmetry of the *mark*
would mean lying about what the mark means.

### The label names the device and nothing else

| side | phase | label |
| --- | --- | --- |
| send | `starting` | `waiting for MacBook` |
| send | `waiting` (accepted) | `connecting to MacBook` |
| receive | `connecting` | `connecting to MacBook` |

Both labels come from the panels' existing label tables (`send/labels.ts`, `receive/labels.ts`), which
is where the status-to-copy mapping already lives, next to `sendHeadline`. Final wording is a
copy-voice call at implementation time: short, everyday, no em dash.

The receive side drops the file count and total bytes that `ReceiveDevice` showed. It is real
information, but the progress screen names the files and the byte total a second later, and keeping it
here would put back the second line this change exists to remove. If it turns out to be missed, it
comes back as an `Empty.Description`, which is the slot the long-wait hint already establishes.

The top bar keeps its own lowercase phase word from `sendHeadline` (`waiting for a yes` /
`connecting`). It is not a duplicate of the label, which names the device the phase word cannot.

### The long-wait hint lives in the store, next to its sibling

`ReceiveTransfer` already owns exactly this pattern: `tooSlow = $state(false)`, a `#hintTimer`, and a
`#clearHint()` called from every exit (`transfer-app.svelte.ts:269-355`). `SendTransfer` gets the same
three members, with the timer started in `beginTrusted()` only (a code send has no yes to wait on) and
cleared in `accepted()`, `stop()`, `complete()`, `cancel()`, and `#clearTransfer()`.

The hint renders as `Empty.Description` under the label, so the label stays one short line instead of
growing into a paragraph. This is the one deliberate height change in the view, and it happens at a
moment when nothing else on screen is moving.

Alternative considered: a `setTimeout` inside the component. Rejected — the component would then own
state that outlives its own phase, and the delay would sit apart from the constant that already
governs the identical receive-side hint.

## Risks / Trade-offs

**The accepted phase is short** → After the fold, the check often shows for about a second before
progress takes over. That is the point: the long phase is the wait, and the answer is a confirmation,
not a screen. Worth watching on a fast local connection that the check is not so brief it reads as a
flicker; if it is, the fix is a floor on how long the check holds, not a return to two screens.

**Two spinners in a row, then a gauge** → A send now shows a spinner (waiting), a check (accepted),
then the gauge; a receive shows a spinner then the gauge. The spinner-to-gauge handoff already exists
today and is unchanged, so this adds no new transition, but it is the sequence to watch when checking
the flow end to end.

**Less is on screen while waiting** → The card holds one mark and one line, which on a wide desktop
window is a lot of empty space. `Empty.Root` centres its content and is what the idle and done states
already use at that width, so the emptiness is consistent rather than new.

**Dropping the receive manifest line** → The file count and size disappear from the moment before
bytes move. Reversible in one line if it is missed (see the label decision).

**The hint's copy has to earn its line** → It is the only prose left in the view, so a stiff sentence
would stand out badly. It says what happened and the one thing to check, and nothing else.
