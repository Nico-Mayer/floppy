# polish-sidebar-chrome

## Why

Three visual defects in the one navigation surface, found by inspection. All
three are in `AppSidebar.svelte` or the classes it hands the vendored sidebar,
and all three have been root-caused to a specific line rather than guessed at.

1. **The brand row is a bare text node.** `Sidebar.MenuButton` renders
   `<button>Floppy</button>` with no handler — a focusable control that does
   nothing, announced to assistive tech as actionable. It is also the default
   `h-9` size while the footer account row is `size="lg"`, so the two ends of
   the sidebar read as different components. In the icon rail the row is
   squeezed to `size-8!` and the text has no wrapping `<span>`, so the base
   variant's `[&>span:last-child]:truncate` never applies and "Floppy" is
   clipped mid-word inside a 32px box.

2. **The footer sits flush against the window bottom.** `Sidebar.Footer` is
   given `class="pb-(--safe-bottom)"`. `sidebar-footer.svelte`'s own base is
   `p-2`, and tailwind-merge lets the caller's `pb-*` win over `p-2`'s bottom
   side. On desktop `--safe-bottom` resolves to `0px`, so the intended 8px of
   breathing room is deleted and the collapsed rail's avatar tile touches the
   window edge.

3. **The mobile drawer paints the bottom-sheet card.** `drawer-content.svelte`
   draws a floating panel with a `before:` pseudo-element
   (`before:inset-2 before:rounded-4xl before:border before:shadow-xl
   before:bg-popover`). `sidebar.svelte` overrides `p-4`→`p-0` and
   `bg-transparent`→`bg-sidebar`, but tailwind-merge does not touch `before:*`
   utilities, so the card survives. `-z-10` does not hide it either: the content
   element is `fixed z-50` and therefore establishes a stacking context, inside
   which negative-z descendants paint *above* the element's own background. The
   nav drawer ends up with two surface colours, a 1px border, and a ~26px corner
   radius on a full-height edge-anchored panel, with `p-0` leaving nothing to
   pad the top and bottom rows clear of those corners.

## What Changes

- Replace the brand text node with the app mark plus a two-line label, built on
  `Sidebar.MenuButton size="lg"` so it mirrors the footer account row and
  inherits the component's own rail-collapse geometry.
- Make the brand row non-interactive: render it through the `child` snippet as a
  `<div>` and neutralise the inherited hover/active affordances.
- Rename `static/maybe-logo.png` to `static/logo.png` so the placeholder can be
  swapped without touching markup.
- Make the footer's bottom padding additive with its own `p-2` instead of
  replacing it, so desktop keeps 8px and mobile gets 8px plus the safe inset.
- Add a separator above the footer so the account row reads as a distinct region
  rather than a nav row that fell off the edge.
- Suppress the vaul card on the navigation drawer only, at the existing patch
  site in `sidebar.svelte`, leaving `drawer-content.svelte` unmodified.

Out of scope, captured as a follow-up rather than built here: moving the mark
into the desktop titlebar and keeping the sidebar brand row mobile-only. The
desktop titlebar's left region is a Tauri drag region, per-OS placement differs,
and it partially re-forks the unified responsive shell. Not worth bundling into
a defect fix.

## Capabilities

- `app-shell` — the sidebar brand row, the footer's bottom inset, and the
  separator are all desktop-and-mobile shell chrome.
- `mobile-navigation` — the drawer's surface treatment.

## Impact

- `src/lib/components/shell/AppSidebar.svelte` — brand row, footer padding,
  separator.
- `src/lib/components/ui/sidebar/sidebar.svelte` — one added utility on the
  mobile `Drawer.Content` class. Already a vendored patch site (see its header
  comment); this change adds a fifth load-bearing item to that file's re-apply
  checklist.
- `static/maybe-logo.png` → `static/logo.png`.
- No Rust, no IPC, no broker. Frontend-only.

## Risks

- `drawer-content.svelte` stays untouched, so `shadcn-svelte update drawer`
  cannot regress this. But `shadcn-svelte update sidebar` overwrites
  `sidebar.svelte` and would drop the fix; the file's own comment block is the
  mitigation and must be extended.
- ~~The claim that the rail already sizes `lg` rows to 32×32 is derived from
  reading the CSS, not from observing the running app.~~ **Resolved.** Confirmed
  against the compiled stylesheet and by running the class strings through the
  project's `tailwind-merge`; see design D2. No height override needed.
- `static/logo.png` is a 1000×1000 PNG rendered at 32px — a 30x oversample
  shipped to mobile. Acceptable for a placeholder; noted so the eventual real
  mark ships as SVG.
