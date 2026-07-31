# Tasks

## 1. Brand row

- [x] 1.1 `git mv static/maybe-logo.png static/logo.png`. Confirm nothing
      referenced the old name (nothing does today) and that `static/favicon.png`
      is left alone — it is a separate asset cut from `app-icon.png`.
- [x] 1.2 Replace the `Floppy` text node in `AppSidebar.svelte`'s
      `Sidebar.Header` with a `Sidebar.MenuButton size="lg"` rendered through
      the `child` snippet as a `<div>`: a `size-8 shrink-0` `<img src="/logo.png"
      alt="">` followed by a two-line label, "Floppy" over "Peer-to-peer
      transfer" in `text-xs text-muted-foreground`. Mirror the footer account
      row's markup so the two stay in step.
- [x] 1.3 Neutralise the inherited affordances on that row: `cursor-default`,
      `hover:bg-transparent`, `active:bg-transparent`. No `tooltipContent`. Do
      not reach for `pointer-events-none` — see design D3.
- [x] 1.4 Record in the file's header comment why the brand row is `size="lg"`
      and not `default`: only `lg` gets `p-0!` in the rail, so only `lg` leaves a
      32px content box for a `size-8` mark. A future edit to `default` would
      silently clip the logo.

## 2. Footer spacing and separator

- [x] 2.1 Change `Sidebar.Footer`'s class from `pb-(--safe-bottom)` to
      `pb-[calc(--spacing(2)+var(--safe-bottom))]`, and update the comment above
      it to say why it is additive: the bare token replaced `p-2`'s bottom side
      and collapsed to zero on desktop.
- [x] 2.2 Add `<Sidebar.Separator />` between `Sidebar.Content` and
      `Sidebar.Footer`. Its stock `mx-2 w-auto` leaves a 16px stub in the 32px
      rail; add `group-data-[collapsible=icon]:mx-1` if that reads too short
      once seen.
- [x] 2.3 Fix the separator's width (found in review — it was inset left and
      overflowing right in the rail). The component's bare `w-auto` never
      overrode `separator.svelte`'s `data-[orientation=horizontal]:w-full`, so
      the rule was 100% of the sidebar plus its margins. Repeat the prefix:
      `data-[orientation=horizontal]:w-auto`. See design D6.

## 3. Mobile drawer surface

- [x] 3.1 Add `before:hidden` to the class `sidebar.svelte` passes
      `Drawer.Content`. Do not edit `drawer-content.svelte` — `responsive-dialog`
      is a bottom sheet and wants the card.
- [x] 3.2 Extend the "four things here are load-bearing" comment at the top of
      `sidebar.svelte` to five, covering `before:hidden` and the reason it exists
      (the `before:` card is invisible to tailwind-merge, and `-z-10` does not
      hide it because the content element establishes a stacking context).

## 4. Verify

- [x] 4.1 Settle design D2. Done without a browser, against the compiled
      stylesheet (`width/height: 2rem !important` vs a plain `.h-14`) and by
      running the class strings through the project's own `tailwind-merge`
      (`p-2!` dropped, `size-8!` + `p-0!` kept). Rail rows are 32×32; the
      `h-8!` fallback is not needed. D2 and the proposal's risk list updated.
- [x] 4.2 Desktop, rail collapsed: the account avatar has a visible gap to the
      window bottom, and the logo is drawn whole with no clipped text.
- [x] 4.3 Desktop, expanded: brand and account rows are the same height and the
      separator sits between the destinations and the account row.
- [x] 4.4 Phone (or `isPhoneChrome` emulation): the drawer is one flat surface,
      no inset outline, no second background colour, no corner clipping the first
      or last row. Account row clears the gesture bar with a gap above it.
- [x] 4.5 Open a bottom sheet elsewhere (`responsive-dialog`) and confirm it
      still has its card outline and radius.
- [x] 4.6 Tab through the sidebar: focus goes header menu control → destinations
      → account row, skipping the brand row entirely.
- [x] 4.7 Check the mark in both light and dark themes. The glyph is flat cyan on
      `--sidebar`, which should hold in both; if it does not, that is an asset
      problem to hand back, not a CSS one.
- [x] 4.8 Re-check the separator in the rail after the D6 width fix: equal gap on
      both sides, nothing crossing the sidebar's right border.
