# Design

Three defects, three mechanisms. Each one turned out to be a specific
interaction between tailwind-merge, Tailwind's `!important` modifier, and CSS
stacking — not an oversight — so the mechanism is recorded here rather than
rediscovered later.

## D1 — Why the brand row must be `size="lg"`

Not a style preference. The mark has to render at `size-8` to match the account
avatar, and only the `lg` variant leaves room for it in the icon rail:

```
base variant:  group-data-[collapsible=icon]:size-8!  group-data-[collapsible=icon]:p-2!
lg variant:    h-14 px-3 text-sm  group-data-[collapsible=icon]:p-0!
```

Both `p-*` rules carry the same variant prefix and the same property group, so
tailwind-merge dedupes them and `lg`'s `p-0!` wins. In the rail:

| size | rail box | padding | content box | fits a `size-8` mark? |
| --- | --- | --- | --- | --- |
| `default` | 32×32 | `p-2!` | 16×16 | no, overflows and is clipped |
| `lg` | 32×32 | `p-0!` | 32×32 | yes, exactly |

Destination rows get away with `default` because the base variant carries
`[&_svg]:size-4`, which shrinks their Lucide icons to fit the 16px box. That
selector does not match an `<img>`, so the mark would not shrink with it.

## D2 — The rail collapses `lg` rows to 32px, so nothing else is needed

`group-data-[collapsible=icon]:size-8!` uses Tailwind v4's trailing-`!`
important modifier, emitting `height: 2rem !important`. The `lg` variant's plain
`h-14` (3.5rem) loses to it. tailwind-merge does not dedupe the two, because
different variant prefixes are treated as different scopes, so both class names
survive into the stylesheet and `!important` decides at cascade time.

Consequence: in the rail an `lg` row is a 32×32 box with zero padding holding a
32×32 mark — an exact fit, no dead space, uniform with the destination rows
above it. No explicit height override is warranted.

**Confirmed** (task 4.1). Two checks against the real artifacts rather than the
source:

- The production stylesheet emits
  `[data-collapsible=icon] *){width:calc(var(--spacing) * 8)!important;height:calc(var(--spacing) * 8)!important}`
  against a plain `.h-14{height:calc(var(--spacing) * 14)}`, so `!important`
  decides and the row is 32px tall.
- Running the base and `lg` class strings through the project's own
  `tailwind-merge` returns
  `group-data-[collapsible=icon]:size-8! h-14 px-3 text-sm group-data-[collapsible=icon]:p-0!`
  — `p-2!` dropped, `size-8!` and `p-0!` both retained.

No height override is needed. The `group-data-[collapsible=icon]:h-8!` fallback
this section previously held in reserve is not required.

## D3 — Non-interactive brand row

`Sidebar.MenuButton` renders a `<button>` by default. The `child` snippet lets a
`<div>` receive the same computed props, which keeps the rail-collapse geometry
coming from the component instead of being re-implemented at the call site —
the thing `AppSidebar.svelte`'s header comment already warns against.

The inherited `hover:bg-sidebar-accent` and `active:bg-sidebar-accent` must be
neutralised separately, or an inert row still advertises itself as pressable.
`pointer-events-none` is the wrong tool: it would also block text selection.
No `tooltipContent` is passed, because a rail tooltip explaining a logo is noise.

`alt=""` on the mark, since the adjacent text already says "Floppy" and a
non-empty `alt` would announce the name twice.

## D4 — Additive safe-area padding

`pb-(--safe-bottom)` replaced `p-2`'s bottom side because tailwind-merge treats
a caller's `pb-*` as more specific than a base `p-*`. Resolving to `0px` on
desktop then deleted the spacing entirely.

`pb-[calc(--spacing(2)+var(--safe-bottom))]` restores the 8px and adds the inset
on top. Two alternatives were rejected:

- `max-md:pb-(--safe-bottom)` fixes desktop but leaves the mobile account row
  hugging the gesture bar with no gap at all — trading one platform's bug for
  another's.
- Moving the rule into `layout.css` on `[data-slot='sidebar-footer']` would be
  additive by cascade, but splits the rule away from the call site that needs
  it. Rejected for locality.

## D6 — The separator needs its width override prefixed

Found during verification: in the rail the rule sat inset on the left and hung
past the sidebar edge on the right.

`sidebar-separator.svelte` asks for `mx-2 w-auto`, intending an inset rule. The
`w-auto` never lands. `separator.svelte` sets
`data-[orientation=horizontal]:w-full`, and tailwind-merge scopes conflicts by
variant prefix — a bare `w-auto` and a `data-[…]:w-full` are different groups, so
both survive the merge, and the attribute selector wins on specificity anyway.
Width resolved to 100% of the container *plus* its margins, which is exactly the
asymmetry observed.

Repeating the prefix (`data-[orientation=horizontal]:w-auto`) puts the two in the
same group so the merge collapses them; `w-auto` in the sidebar's flex column
then stretches to the container width minus the margins.

Fixed at the call site, not in `sidebar-separator.svelte`: it has one consumer,
and the same reasoning as D5 applies about not opening new vendored patch sites.

Note this is the *fourth* appearance of one root cause in this change — D2, D4,
D5, and D6 are all tailwind-merge failing to dedupe across a variant-prefix
boundary. The general lesson for this codebase: **an override only replaces a
component's class if it carries the identical variant prefix.** Otherwise both
ship and the cascade decides, usually not in your favour.

## D5 — Suppress the vaul card at the sidebar, not the drawer

`drawer-content.svelte` paints its floating card with a `before:` pseudo-element.
Two reasons it survives `sidebar.svelte`'s overrides:

1. tailwind-merge rewrites `p-4`→`p-0` and `bg-transparent`→`bg-sidebar`, but has
   no conflict group for `before:*` utilities, so every one of them passes
   through untouched.
2. `-z-10` does not push it behind the panel background. `DrawerPrimitive.Content`
   is `fixed z-50` and so establishes a stacking context; within one, paint order
   is the element's own background first, *then* negative-z descendants. The card
   lands on top of `bg-sidebar` and under the menu rows.

`p-0` compounds it: with the base `p-4` gone, nothing holds the first and last
rows clear of the card's ~26px corners.

Fix is `before:hidden` on the class `sidebar.svelte` hands `Drawer.Content`.
`before:hidden` sets `display: none`, which beats `before:absolute` outright, and
tailwind-merge leaves both in place (display and position are separate groups) —
harmless, since the element is gone.

Scoping it here rather than in `drawer-content.svelte` is deliberate.
`sidebar.svelte` is *already* a vendored patch site with a documented re-apply
checklist; `drawer-content.svelte` is not. Editing the sidebar adds one item to
an existing list. Editing the drawer would open a second front, and
`responsive-dialog` — the only other consumer, and a bottom sheet — legitimately
wants the card.

Cost: `shadcn-svelte update sidebar` still drops this. The header comment in
`sidebar.svelte` is the mitigation and gains a fifth entry.
