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
- One component for this and the completion screen, since they were already the same surface.

**Non-Goals:**

- Any illustration of the devices, or a beam between them. Considered and dropped: the second mark is
  the device you are holding, which is the one fact the user already has.
- Carrying the connection view into the transfer itself. Connection and progress stay two screens and
  the one-gauge requirement in `transfer-panel-layout` is untouched.
- Any change to the code-target screens (getting ready, then the code and QR).
- Any change to `PendingHint` or the gauge, and no change to the completion screen's copy or actions.
- Recalling an offer. Cancel still only stops us waiting; see the note at `SendPanel.svelte:176`.

## Decisions

### One component for both, named `StatusHero`

`TransferComplete` and the connecting view were the same surface with a different mark in it, so they
are one component: `src/lib/components/feedback/StatusHero.svelte`.

The name pairs it with `EmptyHero`, which already sits beside it. *Hero* is this app's word for the big
centred thing in a card, and the two divide cleanly: `EmptyHero` is the mascot for a panel with nothing
happening yet, `StatusHero` is a mark for a panel where something is happening or has just finished.
Rejected alternatives: `TransferStatus` (confusable with `TransferProgress`, which is the gauge next
door), and `PanelState` (says nothing about what it looks like).

Its whole API is a mark and three optional text rows with fixed roles:

```
mark: 'pending' | 'success'   // spinner, or a check that pops on arrival
title?: string                // the bold line — a flow that ended and wants a summary
label?: string                // the quiet line — who this is with, or what it came to
hint?: string                 // a quieter aside that turns up late
```

The two screens are then the same component with different rows filled in:

| screen | mark | title | label | hint |
| --- | --- | --- | --- | --- |
| device send, waiting | `pending` | — | `waiting for MacBook` | after 15s |
| device send, accepted | `success` | — | `connecting to MacBook` | — |
| device receive | `pending` | — | `connecting to MacBook` | — |
| send done | `success` | `Sent 3 files` | `to MacBook` | — |
| receive done | `success` | `Got them from MacBook` | — | — |

`title` present means a flow ended and gets a headline; absent means this is a live status that should
not shout. That single rule is what lets one component carry both weights without a mode flag.

`mark: 'success'` rather than `'done'` on purpose: the check also marks something being agreed
part-way through a screen (the other device saying yes), not only an ending.

### There is no action slot, and that is a decision

The obvious next prop is a primary and secondary call to action. It is deliberately absent: a transfer
panel's controls belong in `TransferCard`'s anchored zone, at one position across every state, which
`transfer-panel-layout` requires by scenario — "the action controls render at the same anchored bottom
position in every state". A button rendered inside this hero would be the one control that moved.

Where a hero *does* own its call to action, the app already has the right slot for it: the Devices
screen's empty state puts its add button in `Empty.Content` (`DeviceList.svelte:211`). That surface
composes `Empty.*` directly, which is the generic this component is a specific composition of, so
nothing is lost by keeping actions out of here.

### The skeleton

`Empty.Media variant="icon"` is a fixed `rounded-xl` frame around a centred glyph. `StatusHero` takes
it a size up from what `TransferComplete` used (`size-16` frame, `size-8` glyph), because here the mark
is the whole message:

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

The frame is why the swap is free: it is a fixed box and both glyphs are the same size inside it, so
nothing measures differently before and after. The check keeps `animate-pop`, the class the completion
screen already entered on, so the success vocabulary is inherited rather than re-invented — and it
degrades to a fade under reduced motion through the existing rule in `layout.css`, so no branch here
has to know about the preference. The spinner is the shared `Spinner` at its `panel` size, which is
that scale's own name for the centred wait of a whole surface.

On a live status the words go a weight down: the label is an `Empty.Description`, not an `Empty.Title`.
A bold heading would compete with the mark it exists to explain, and the sentence it replaced was the
thing this change set out to delete. The long-wait hint sits below it a step quieter again (`text-xs`),
and slides in with `fly` rather than blinking into place — the treatment `ReceiveSearching` already
gives its own late-arriving hint, for the same reason.

Alternative considered: extending `PendingHint` with a done state. Rejected — `PendingHint` is the
small inline "still working" report used in six places, and this is the hero of an otherwise empty
card. Widening it would make every existing caller carry a state it has no use for.

### Both panels pass words, not directions

No `direction` prop is needed once the copy lives in the panels' label tables (`sendConnectLabel`,
`receiveConnectLabel`): the only real difference between the two sides is which words the panel passes
in, and whether the mark can ever reach `success`.

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

The hint renders as a second, smaller `Empty.Description` under the label, so the label stays one short
line instead of growing into a paragraph. This is the one deliberate height change in the view, and it
happens at a moment when nothing else on screen is moving.

It carries only the thing to check (`make sure Floppy is open over there`) and not what happened: the
label directly above it already says who the send is waiting for, so a "no answer yet" would be that
line a second time.

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
