## Context

The Send idle action zone today is `SendPanel.svelte`'s idle branch: a `flex items-center gap-2`
row holding `SendTargetPicker` (a bordered `Select.Trigger` on a fine pointer, a bordered
`NativeSelect.Root` on a coarse one, or a pair-entry link when nothing is trusted) and a
labelled `Button` reading "Send". That row shares one CSS grid cell with `PendingHint variant="pill"`
so the in-flight pick report can crossfade in without moving anything — the two are deliberately
the same height (`h-9`, `pointer-coarse:min-h-11`).

Constraints this design has to respect:

- The grid-cell crossfade is load-bearing (`transfer-panel-layout`: nothing moves during the swap),
  so the pill's height and the `PendingHint` pill's height are one number and have to stay one number.
- Hit areas come from the `interaction` capability: 44px minimum on a coarse pointer, and the
  `Button` primitive derives that from `size` + `touch` rather than from call-site classes.
- `select-trigger.svelte` and `native-select.svelte` are vendored shadcn files that already carry
  local patches. Every patch has to be re-applied by hand after a registry update, so adding
  another one is a real cost, not a stylistic preference.
- Tailwind override classes only win if they repeat the exact variant prefix of the class they are
  overriding. `select-trigger` sets its height as `data-[size=default]:h-9`, so a bare `h-full` at
  the call site loses on specificity. This has bitten this codebase before.
- The card is `@container`-scoped and goes full-bleed below `sm`; the narrowest real width is a
  ~315px phone card.

## Goals / Non-Goals

**Goals:**

- One elevated pill in the idle action zone at every width, holding the target and an icon-only Send.
- The Send glyph and accessible name track the chosen target (device → send, code → QR).
- The pending-pick report keeps matching the zone exactly, so the crossfade still costs no layout.
- No new responsive branch, no new component indirection, no vendored-file patch if avoidable.

**Non-Goals:**

- Floating the pill over the file grid. It stays docked in the anchored action zone where Cancel
  and "Send something else" sit; a floating bar would collide with the phone add-FAB and need
  grid padding of its own.
- Touching the non-idle states (starting / waiting / sending / done keep their plain buttons).
- Changing what a send does, which target it picks, or how the picker sources its options.
- Restyling the Receive panel's action zone. If the pill turns out to be right there too, that is
  its own change.

## Decisions

### The pill is markup in `SendPanel`, not a new component

The pill wrapper (`flex items-center rounded-full border bg-card shadow-sm`) lives in the idle
actions branch of `SendPanel.svelte`, next to the grid cell it shares with `PendingHint`. There is
exactly one call site, and the height is coupled to the report sitting in the same cell — putting
the wrapper in a separate file would move one half of that coupling out of sight of the other.

Alternative considered: a `SendActionBar.svelte`. Rejected as indirection for a single caller;
the existing comment block in `SendPanel` is already where this zone's reasoning is documented.

### Height: `h-12`, `pointer-coarse:h-14`, padding `p-1`

The inner Send button is `size="icon-lg"` (40px) with `touch="grow"` (→ 44px minimum on a coarse
pointer, the treatment `interaction` wants for a primary action). `p-1` on the pill means the
content box is 40px on a fine pointer and 48px on a coarse one, so the button fits in both without
a per-pointer size prop.

`PendingHint`'s `pill` variant takes the same `h-12 pointer-coarse:h-14`, replacing its current
`h-9 pointer-coarse:min-h-11`. That variant exists to stand in a control's slot and is used by
exactly one call site (this zone), so retuning it is not a cross-screen change — but its comment
has to keep naming the numbers it is matching, since that is the only thing stopping the two from
drifting.

Alternative considered: keeping `h-9` and using `touch="slop"` on the Send button (invisible
expanded hit area, 36px visible). Rejected: the primary action of the screen should be big enough
to see, which is the distinction `grow` vs `slop` encodes.

### Chrome removal by override class, not by a new vendored variant

`SendTargetPicker` owns the overrides so the call site stays a plain `<SendTargetPicker />`:

- Styled listbox: pass `class` to `Select.Trigger` with `border-transparent bg-transparent
  shadow-none`, plus `data-[size=default]:h-full` — the exact prefix the vendored file uses for
  height, because a bare `h-full` loses to it. Focus indication stays: the trigger's
  `focus-visible:ring-3` classes are untouched.
- Native select: the wrapper takes the class, not the `<select>`, so reach the control with
  descendant variants — `[&>select]:bg-transparent [&>select]:border-transparent [&>select]:h-full`.
  A descendant selector outranks the child's own single-class rules, so this wins regardless of
  merge order and needs no prefix matching.

Alternative considered: adding a `variant="bare"` to both vendored files via `tailwind-variants`.
Cleaner in the abstract, but it makes two more registry files carry a local patch for one caller.
Revisit if a second surface ever needs a chrome-less picker.

### The glyph is derived from the same `selection` the dispatch uses

`SendPanel` already derives `selection` (the picked target, falling back to `'code'` when the
device is no longer trusted) and `dispatchSend()` branches on it. The icon and the accessible name
derive from that same value, so the glyph can never disagree with what pressing it does — including
the un-trust case, where the fallback flips both at once.

Icons: `SendIcon` (already imported) for a device, `QrCodeIcon` from `@lucide/svelte/icons/qr-code`
for the code target.

Accessible names, per the copy voice (plain words, no jargon, tell the person what happens):
`Send to <device name>` for a device, `Show the code` for the code target. Not "Send" alone for the
code target: pressing it does not hand files to anyone yet, it puts a code on screen.

### The pair-entry link becomes pill content

When nothing is trusted, `SendTargetPicker` renders a `variant="link"` anchor instead of a picker.
It stays inside the pill and keeps its own sizing; only the pill around it is new. This keeps the
zone one shape in both states, which is what the "single row" requirement has always been about.

## Risks / Trade-offs

- **An icon-only primary action is less obvious than a labelled one** → The glyphs are the two most
  conventional ones available (paper plane, QR square), the accessible name carries the full
  sentence, and the target sitting immediately left of the button is the rest of it. Verify on a
  real phone before archiving.
- **The zone-height coupling can silently drift** (pill retuned, `PendingHint` pill not) → Both
  numbers stay written in each other's comments, and the delta spec has a scenario for the swap
  costing no layout. Check it by starting a pick over a full queue and watching the queue's last
  row.
- **Override classes are fragile against a shadcn registry update** → Accepted over a third
  vendored patch, and the `data-[size=default]:h-full` prefix trap is called out here and in a code
  comment. If the vendored trigger ever stops setting height under a `data-size` prefix, the pill
  will show a short trigger, which is visible at a glance rather than silent.
- **A chrome-less native select loses its own affordance on some platforms** → The wrapper's
  chevron is drawn by us, not the OS, and is left alone; only the background and border go.
- **Dark mode**: `bg-card` on top of a card that is itself `bg-card` at desktop widths gives no
  contrast → the pill uses a raised treatment (`bg-muted/40` + border + `shadow-sm`) rather than
  `bg-card`, and is checked in both themes and both chrome treatments (bleed on phone, card on
  desktop).

## Open Questions

None blocking. The exact raised treatment (muted fill vs. card fill plus shadow) is settled by
eye during implementation against both themes; the requirement only asks that it read as one bar.
