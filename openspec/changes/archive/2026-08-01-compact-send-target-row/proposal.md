## Why

The Send panel's action zone stacks three things — a "Send to" field label with an
icon button beside it, a full-width target select, and a full-width Send button — so
roughly 110px of the card goes to one decision and one action. On a phone that is a
whole row of file tiles lost from the queue above it. It also reads as three separate
controls when it is really one sentence: send *these files* to *this target*, now.

The target select is also a custom listbox on every platform. On a phone the OS
already has a picker that is easier to hit, scrolls better, and looks like the rest
of the system.

## What Changes

- The Send panel's idle action zone collapses from three stacked rows to **one row**:
  the target control on the left (flexible, truncating) and the Send button on the
  right. The "Send to" field label goes away — the Send button beside the target name
  already says what the row does.
- The **standing add-a-device shortcut goes away**. It was an icon button whose only
  explanation was a tooltip, which a finger cannot open, sitting beside a control that
  already lists the paired devices. Devices is a top-level destination, so the
  shortcut bought one tap at the cost of a cryptic glyph in the tightest row on the
  screen. What stays is the first-run case: with nothing paired yet the picker would
  be a one-option control, so it is not rendered and the "Add a device and skip the
  code" link takes its slot. That is the moment the entry was added for.
- On **coarse-pointer devices the target picker renders as a native `<select>`**
  (shadcn-svelte `native-select`), so the choice is made in the OS picker. Fine-pointer
  devices keep the styled `Select` with its icons and grouping. Both carry the same
  values, the same grouping ("Anyone with a code" / "Your devices"), and the same
  binding.
- Copy stays as it is: `Anyone with a code`, device names verbatim, `Send`,
  `Add a device and skip the code`.

No transfer behaviour changes: the same `send.start()` / `pairing.sendTo()` dispatch,
the same fall-back-to-code rule when the chosen device is un-trusted mid-selection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transfer-panel-layout`: new requirement — the Send idle action zone is a single
  row (target + add-device entry + Send), and the target picker uses the platform's
  native select on coarse pointers.
- `device-management`: the existing "Entry to pairing from the send flow" requirement
  narrows — the entry exists only while nothing is paired, in the picker's slot, and
  retires once a device exists rather than standing beside the picker forever.

## Impact

- `src/lib/components/transfer/send/SendTargetPicker.svelte` — rewritten: no field
  label, branch on `isTouch()` between `NativeSelect` and `Select`, the tooltip-wrapped
  add-device icon button deleted (and with it the component's `Tooltip` import).
- `src/lib/components/transfer/send/SendPanel.svelte` — the idle `actions` snippet
  becomes one flex row instead of a `flex-col gap-3` stack; `SendTargetPicker` grows
  to fill it and the Send button shrinks to its content.
- `src/lib/components/ui/native-select/` — new, added from the shadcn-svelte registry
  (`npx shadcn-svelte@latest add native-select`).
- No Rust, IPC, broker, or spec-level transfer change. No new dependency beyond the
  registry component.
