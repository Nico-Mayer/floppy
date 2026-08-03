## Context

`SendPanel.svelte`'s idle `actions` snippet is a `flex flex-col gap-3` holding
`SendTargetPicker` above a full-width Send button. `SendTargetPicker` is itself a
`Field.Field` with a label row ("Send to" plus a ghost icon button linking to
`/devices`) above a full-width `Select.Trigger`. That is three stacked rows plus two
gaps — about 110px — inside a card whose remaining height is the file queue's scroll
area.

Two forces on the design already exist in the repo and constrain the fix:

- `TransferCard` anchors an actions zone at the bottom of the card and every panel
  state renders into it (`transfer-panel-layout`, "All states share a stable two-zone
  structure"). The Send button's position must not move relative to Cancel and
  "Send more files".
- `device-management` requires the send flow to offer a way into Add-a-device. The
  current picker satisfies that with the shield-plus icon button in the label row and,
  when nothing is paired, with a standalone link that replaces the whole picker.

The existing code carries a long comment explaining why the add-device entry is *not*
an item inside `Select.Content`: `Select.Content` is a listbox whose children are
values, and bits-ui's keyboard navigation only walks `[data-select-item]` nodes, so a
command placed there would be a value by ARIA and mouse-only by keyboard. That
reasoning holds for a native `<select>` too — an `<option>` is a value, full stop — so
whatever the row becomes, the entry stays outside the picker.

## Goals / Non-Goals

**Goals:**

- Cut the idle action zone to one row so the file grid gets the height back.
- Make the row read as one sentence: *this target* → *Send*.
- Give coarse-pointer devices the OS picker instead of a custom listbox.
- Keep the send flow teaching pairing to someone who has never paired anything, and
  stop it advertising pairing to someone who already has.

**Non-Goals:**

- No change to any other panel state's actions (cancelling, waiting, sending, done).
- No change to the Receive panel.
- No change to dispatch: `send.start()` for `code`, `pairing.sendTo()` for a
  fingerprint, and the derived fall-back to `code` when the picked device disappears.
- Not adding a device-picking surface anywhere else (no drawer, no command palette).

## Decisions

### The row is `[target] [Send]`, with the target flexible

A single `flex items-center gap-2` row. The target control takes `flex-1 min-w-0` and
truncates its label; Send keeps its content width at the trailing edge, which is where
the eye lands and where the thumb is on a phone.

Width check at the tightest real case (a ~315px full-bleed card on a small phone):
picker ~210px + Send ~95px + one 8px gap. The picker's `min-w-0` + `truncate` absorbs
whatever is left, so a long device name shortens rather than pushing Send off the
edge.

Alternative considered: keep the picker on its own row and only drop the "Send to"
label. Saves ~28px of the ~110px, and still reads as two decisions. Rejected — it
does not address the complaint.

Alternative considered: a split button (`Send ▾`) with the target inside the menu.
One row and the smallest possible, but it hides *who the files are going to* behind a
tap, which is the single most consequential fact on this screen. Rejected.

### The "Send to" label is dropped, not hidden

The visible `Field.FieldLabel` goes away. The control keeps `aria-label="Send to"` so
the accessible name survives, and the Send button beside it supplies the visible
reading. Removing `Field.Field` entirely (rather than keeping it with an `sr-only`
label) is deliberate: `Field.Field` exists to lay a label, control, and description
into a column, and there is no column left.

### The standing add-device shortcut is deleted; the first-run link stays

The shield-plus icon button beside the picker goes. Three things were wrong with it
once the row got tight: its only explanation was a tooltip, and a tooltip never opens
on a touch screen, which is the case this whole change is optimising for; it sat next
to a control that already lists every paired device, so it was decoration on top of
evidence; and Devices is a top-level destination in the bottom bar and the sidebar, so
it was buying exactly one tap.

The first-run case is different and it stays. A one-option picker is not a choice, so
when `pairing.devices.length === 0` nothing is rendered as a picker and the existing
`Add a device and skip the code` link takes that slot: `[link] [Send]`. Without it the
Send screen would say nothing about devices at all, which is the exact problem the
entry was introduced to fix. Once a device exists the picker is the standing evidence
and the link retires.

Both states are one row and Send does not move between them, so pairing the first
device swaps the left slot and nothing else.

`device-management`'s "Entry to pairing from the send flow" narrows to match: the
entry is required while nothing is paired and required *not* to persist afterwards.

Alternative considered: keep the icon button and only fix the tooltip. Rejected — the
tooltip is the symptom, not the problem. Alternative considered: drop the entry
entirely, including the empty state. Rejected — it costs a first-time user the only
hint that code-free sending exists, to save a row that is not rendered anyway once
anything is paired.

### Coarse pointer picks the control: `NativeSelect` vs `Select`

`isTouch()` from `$lib/platform` is the switch. Rationale matches what that file
already says the signal is for: hit areas and controls that cannot be revealed by
hover. A native `<select>` hands its option list to the OS, which draws a
finger-sized picker (a wheel on iOS, a dialog on Android) that scrolls and dismisses
the way the rest of the system does.

Not `isNarrow()`: the question is not how wide the window is, it is what is pointing
at it. Not `isPhoneChrome`: a touchscreen laptop benefits from the native picker too,
and `isPhoneChrome` is false in the `:1420` browser preview, which would make the
mobile branch unpreviewable.

Consequence: `isTouch()` is reactive, so plugging in a mouse can swap the control
between renders. That is fine — the two share one bound value and one option set, and
neither holds internal state that a remount would lose.

Consequence: a native `<select>` cannot render icons in its options or in its closed
state, so the globe/laptop glyphs are lost on touch. Structure is carried by
`<optgroup>` labels instead ("Your devices"), which is what the styled Select uses
`Select.GroupHeading` for. The `code` option keeps its full label, `Anyone with a
code`, which is self-describing without the globe.

### Both branches bind the same value

`SendTargetPicker` keeps its `value = $bindable()` prop and its `'code' | fingerprint`
contract; `SendPanel` keeps the getter/setter binding that writes through to `picked`
while reading the corrected `selection`. Only the rendering branches. The native
`<select>` binds with `bind:value` on `NativeSelect.Root` the same way `Select.Root`
does, so there is no second source of truth and no `$effect` syncing two controls.

### The vendored native select is patched for the coarse-pointer minimum

The registry's `native-select` is `h-9` (36px) at `text-sm`, and this control renders
*only* on a coarse pointer, so it would ship permanently under the 44px `interaction`
requires. `interaction` says the minimum belongs to the shared primitives rather than
to call sites, and `input.svelte` and `select-trigger.svelte` are already patched the
same way, so the fix goes in the vendored file with the house
`// PATCHED (not from the shadcn-svelte registry)` header: `pointer-coarse:min-h-11`,
plus `text-base md:not-pointer-coarse:text-sm` because iOS zooms the page on a control
smaller than 16px and an iPad is wider than `md`.

## Risks / Trade-offs

- **The row overflows on a very narrow card** → the picker is the only flexible item
  and it truncates; Send is fixed and small. Verified at the ~315px full-bleed case
  above and at the 500px minimum window width the layout spec calls out.
- **Removing the standing shortcut costs a tap for someone pairing a second device**
  → they go through Devices, which is in the bottom bar and the sidebar. Pairing a
  second device is rare next to sending, and it was never worth a permanently
  unlabelled glyph in this row.
- **Losing the option icons on touch reduces scannability** → optgroup labels replace
  them, and the trusted-device list is short by nature (it is a list of one person's
  own machines).
- **`native-select` is a registry component the project does not have yet** → added
  with `npx shadcn-svelte@latest add native-select` and reviewed like any other
  vendored shadcn component. It is a thin styled `<select>` with no new runtime
  dependency.
- **A vendored shadcn component can be clobbered by a future `update --all`** →
  `native-select` joins the list of patched vendored components, so its two touch
  classes have to be re-applied after any registry update. The `// PATCHED` header is
  what makes that findable; the codebase already carries five others.
- **The picker and the button are now visually one unit, which could read as a split
  button** → they keep a normal `gap-2` and distinct shapes (a select trigger with a
  chevron, a filled primary button), not a seam.

## Migration Plan

Frontend-only and self-contained: one new vendored component directory, two edited
Svelte files. Rollback is reverting those. No persisted state, no IPC, no broker.

## Open Questions

None.
