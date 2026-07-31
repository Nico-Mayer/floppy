# Tasks

## 1. Unify the shell into one Sidebar.Provider

- [x] 1.1 Create `AppHeader.svelte` merging `TopAppBar` + `WindowChrome`: platform slots
      (macOS traffic-light spacer + drag region, Windows min/max/close + drag region,
      mobile status-bar padding) and a hamburger shown whenever the sidebar is collapsible.
- [x] 1.2 Rewrite `+layout.svelte` to a single `Sidebar.Provider` (no `isMobile`
      structural fork): `AppHeader` + `AppSidebar` + `Sidebar.Inset` → children. Keep the
      transfer/pairing listeners, safe-area watch, drag-drop, and context-menu suppression.
- [ ] 1.3 Verify desktop (macOS + Windows) window chrome, drag, and controls still work,
      and that the Toaster offset still clears the header.

## 2. Remove the bottom bar and in-app history-back

- [x] 2.1 Delete `BottomNav.svelte` and its imports.
- [x] 2.2 Delete `nav.svelte.ts`; remove `afterNavigate(nav.record)` and all `nav.*`
      usages (header back buttons, BottomNav reset).
- [x] 2.3 Simplify the Android hardware-back handler to: dismiss an open overlay
      (dialog/sheet/drawer via the existing Escape dispatch), else close the window.
- [x] 2.4 Remove the `--bottom-nav-height` token and the `[data-tabbar-clearance]` rule
      from `layout.css`, and drop `data-tabbar-clearance` from the route pages.

## 3. Desktop collapsible icon rail

- [x] 3.1 Set `AppSidebar` to `collapsible="icon"`; ensure labels/hints hide in rail mode
      via `group-data-[collapsible=icon]` and only icons remain.
- [x] 3.2 Remove the forced-open lock; wire the header hamburger to toggle the rail at
      `lg+`.

## 4. Mobile drawer (stock shadcn Sheet)

- [x] 4.1 Keep the `sidebar.isMobile` branch of vendored `ui/sidebar/sidebar.svelte` on the
      stock `Sheet.Root` (a vaul drawer was tried and reverted — see design). Gate
      AppSidebar's `top-(--header-height)!`/height offset to `md:` so the mobile sheet is
      full-height and covers the menu button while open (no close-then-reopen).
- [ ] 4.2 Confirm collapse-on-navigate fires (`setOpenMobile(false)`), overlay-tap and
      back close it, and the sheet clears safe areas (layout.css sheet-content rule).

## 5. Edge-swipe-to-open gesture

- [x] 5.1 Add `isAndroid`/`isIos` (and any `pointerType` helper) to `platform.ts` as
      needed.
- [x] 5.2 Implement a `use:edgeSwipe` action: left-edge `pointerdown` (x < ~20px), gated
      on `pointerType === 'touch'`; past a small threshold call `setOpenMobile(true)`.
- [ ] 5.3 Attach the action to the shell inset; verify mouse no-ops and touch opens.
- [ ] 5.4 On-device iOS check: confirm the WKWebView does not intercept the left-edge
      swipe; if it does, gate the action off on iOS (single `if`, no fork) and note it.

## 6. Transfer screen chrome-dissolve

- [x] 6.1 `TransferCard`: add `max-sm:rounded-none max-sm:border-0 max-sm:shadow-none
    max-sm:bg-transparent`; slim the header on mobile (drop the mono headline row).
- [x] 6.2 `+page.svelte`: move `p-4`/`max-w-2xl` behind `sm:` so mobile is full-bleed.
- [x] 6.3 `ModeSwitcher`: drop the `Tabs.List` shadow on mobile so it reads as a flush
      segmented control under the header.
- [ ] 6.4 Confirm the `@container` panel layouts upgrade to their roomy variants at
      full-bleed width, and the drop target + all states still behave.

## 7. Verify

- [x] 7.1 `npm run check` and `npm run lint` pass.
- [ ] 7.2 Manual pass on macOS, Windows, iOS, and Android: nav model, gesture, safe areas,
      Transfer screen density, and desktop unchanged.
