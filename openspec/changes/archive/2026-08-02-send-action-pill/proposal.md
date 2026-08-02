## Why

The Send idle action zone is a bordered select sitting beside a labelled Send button: two boxes,
two outlines, and the word "Send" repeating a title the card already carries at the top. Under a
grid of file tiles it reads as leftover form furniture rather than the one thing you press. Every
phone music app solved this shape years ago with a single elevated bar in the same spot — one
surface, the "who" filling it, one round icon button at the thumb end.

Making the button icon-only also lets it say something the text never could: a code send and a
device send are different acts, and a QR glyph versus a send glyph tells you which one is armed
before you press it.

## What Changes

- The Send idle action row becomes one pill: a single rounded, elevated bar holding both controls,
  where today there are two separate bordered controls with a gap between them.
- The target control inside the pill loses its own chrome (border, background, its own rounding)
  and becomes the pill's content, taking the leftover width and truncating as it does now. Both
  the styled listbox and the native coarse-pointer select keep their behaviour and their options.
- The Send button becomes icon-only, at the pill's trailing edge, with no visible text.
- The Send icon follows the chosen target: a send glyph for a trusted device, a QR glyph for the
  code target. The accessible name follows too, so the button still says what it does out loud.
- The empty-trust-store state (the "Add a device and skip the code" link, shown when nothing is
  paired) moves inside the pill as its content, so the row keeps one shape whether or not devices
  exist.
- The in-flight pick report keeps standing in the whole zone's slot and keeps the pill's height,
  so the crossfade between the two still moves nothing.
- One shape at every width, phone and desktop. No new responsive branch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transfer-panel-layout`: "The Send idle action zone is a single row" gains the pill container
  and the icon-only Send button whose glyph and accessible name track the chosen target. The
  picker requirement gains the rule that the in-pill controls carry no chrome of their own while
  keeping the same options and the same bound value.

## Impact

- `src/lib/components/transfer/send/SendPanel.svelte` — the idle actions branch: pill wrapper,
  icon-only button, target-derived icon and label.
- `src/lib/components/transfer/send/SendTargetPicker.svelte` — chrome-less trigger and native
  select inside the pill; the pair-entry link becomes pill content.
- `src/lib/components/feedback/PendingHint.svelte` — the `pill` variant is sized to the control it
  replaces, so its height follows the new pill.
- Possibly `src/lib/components/ui/select/select-trigger.svelte` and
  `src/lib/components/ui/native-select/native-select.svelte` if a chrome-less presentation is
  better expressed as a variant than as override classes. Both are vendored shadcn files that
  already carry local patches, so any edit there has to be re-applied after a registry update.
- No Rust, IPC, or transfer-behaviour change. Nothing about who a send goes to or when it starts.
