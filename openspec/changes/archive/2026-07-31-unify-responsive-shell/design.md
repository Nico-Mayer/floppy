## Context

`+layout.svelte` forks on `isMobile` (user agent) into two shells that share no
structure: desktop (`WindowChrome` + `Sidebar.Provider` + `AppSidebar`, forced open at
`lg`, offcanvas below) and mobile (`TopAppBar` + `BottomNav`). The content pages are
already responsive and shared; only the shell is duplicated. Two facts drive the whole
redesign:

1. The fork conflates two independent axes — **window chrome** (needs the platform: only
   a real OS window has a titlebar/traffic-lights/min-max-close and a drag region) and
   **navigation presentation** (needs the width: a persistent sidebar vs. an overlay
   drawer). One `isMobile` flag decides both, which is why a narrow desktop window and a
   phone end up with different navigation models.
2. The shadcn `Sidebar` is already drawer-capable on mobile (`collapsible="offcanvas"`,
   `sidebar.isMobile → Sheet.Root`, `setOpenMobile`), so "reuse the sidebar as a mobile
   drawer" is mostly _deleting the fork_, not building a new component.

The app has no deep navigation — four top-level destinations, each self-contained. That
makes in-app history-back dead weight and, critically, frees the left screen edge (no
iOS back-gesture to collide with), so a ChatGPT-style edge-swipe-to-reveal-menu works
identically on iOS and Android.

## Goals / Non-Goals

**Goals:**

- One shell; platform decides only header chrome, width decides only nav presentation.
- One navigation model across every size: fixed/rail sidebar when wide, the same sidebar
  as a left drawer when touch/narrow, opened by hamburger or edge-swipe.
- Mobile Transfer screen that reads as designed-for-phone: full-bleed, chrome-light,
  one-handed, with unchanged feature parity.
- Maximum reuse, minimal custom CSS, shadcn defaults, no mobile-only code paths beyond a
  single ~20-line gesture action.

**Non-Goals:**

- No Rust/IPC/broker/transport changes — pure frontend.
- No change to the send/receive _flow_, states, or copy.
- No new runtime dependency (vaul-svelte is already installed).
- Not building a true 1:1-from-first-pixel drag-open (see Decision 3).

## Decisions

### Decision 1 — One `Sidebar.Provider`; platform slots live only in the header

Collapse the two `+layout.svelte` branches into a single `Sidebar.Provider`. A new
`AppHeader` merges `TopAppBar` + `WindowChrome` and carries per-platform slots (macOS
traffic-light spacer + `data-tauri-drag-region`, Windows min/max/close, mobile
status-bar padding via `--safe-top`) plus a hamburger shown whenever the sidebar is
collapsible. Navigation presentation is chosen by the sidebar's own width breakpoint, not
by `isMobile`.

- _Alternative — keep two shells but share a `NavMenu` content component:_ more legible
  but keeps the platform branch in `+layout` we are trying to delete. Rejected.

### Decision 2 — Keep the stock shadcn `Sheet` as the mobile renderer (vaul reverted)

The `sidebar.isMobile` branch of the vendored `ui/sidebar/sidebar.svelte` stays the stock
shadcn `Sheet.Root`, bound to `openMobile`/`setOpenMobile`. The whole
`Sidebar`/`useSidebar`/`AppSidebar` API is untouched.

A vaul `Drawer` was tried (for an interactive drag-to-open follow) and **reverted**: its
dismiss layer fought the app across the portal/stacking boundary. The mobile header lives
deep in the component tree behind a `sticky` stacking context, while the drawer overlay
is portalled to `<body>`; the header's `z-index` can't beat the overlay, so an
outside-press always targeted the overlay and the drawer dismissed on any tap over the
bar. Geometry-based `onInteractOutside` guards were brittle. The stock Sheet, made
full-height (Decision 3), covers the menu button while open, so the flip-flop can't occur
at all — a structural fix instead of an event-handling patch.

- _Alternative — vaul with an `onInteractOutside` geometry guard:_ worked only when the
  drawer actually covered the trigger; the real bug was the drawer sitting _below_ the
  header (Decision 3). Not worth vaul's extra edge cases. Rejected.

### Decision 3 — Full-height mobile sheet; the header-offset is desktop-only

The desktop sidebar sits below the header via `top-(--header-height)! h-[…]!` on
`Sidebar.Root`. That class is `!important`, so it also won the mobile Sheet and pushed it
_below_ the header — leaving the hamburger exposed, which is what let a tap close (outside)
then reopen (click). Gate the offset to `md:` so it applies only to the desktop branch;
below `md` the Sheet keeps its default full-height geometry and covers the whole screen,
including the menu button. Closing on mobile is by the scrim, a nav choice, or the back
gesture — the button only opens.

### Decision 4 — Edge-swipe is a thin, touch-gated action that just opens the sheet

A `use:edgeSwipe` action watches `pointerdown` near the left edge (x < ~24px) and, once a
mostly-horizontal drag passes a threshold, calls `setOpenMobile(true)`; the Sheet then
animates in and owns the scrim, focus trap, and dismissal. No interactive 1:1 follow — a
fast threshold-open, which is what most native drawers do.

**Gate on `pointerType === 'touch'`, not on OS.** Mouse pointers no-op (the hamburger
handles them); touch pointers get the gesture. One code path covers iOS, Android, and
touch laptops with zero platform branching.

### Decision 5 — Delete in-app history-back; flat navigation only

Remove `nav.svelte.ts`, the header back buttons, and `afterNavigate(nav.record)`. With
flat destinations there is nothing to pop. Android hardware-back is reduced to: if an
overlay (`dialog`/`sheet`/`drawer` slot, incl. the open nav drawer) is present, dispatch
Escape to dismiss it; otherwise close the window. Switching destinations from the drawer
collapses it (`setOpenMobile(false)` on navigate), so one tap = one move.

### Decision 6 — Desktop sidebar becomes a collapsible icon rail

Desktop keeps a fixed sidebar at `lg+` but gains `collapsible="icon"`: the hamburger
collapses it to a ~48px icon rail (Linear/VSCode idiom) and back. Item labels/hints hide
in rail mode via the existing `group-data-[collapsible=icon]` utilities. No forced-open
lock.

### Decision 7 — Mobile Transfer screen dissolves card chrome (responsive, not forked)

All via responsive utilities on existing components:

- `TransferCard`: `max-sm:rounded-none max-sm:border-0 max-sm:shadow-none
max-sm:bg-transparent` → the card becomes the page below `sm`; desktop untouched.
- `+page.svelte`: drop `p-4`/`max-w-2xl` at mobile (`sm:` prefixes) → full-bleed width.
- `Card.Header`: slim on mobile — drop the mono headline row and shadow; keep the badge
  only where it carries live state.
- `ModeSwitcher` `Tabs.List`: drop `shadow` on mobile and keep `order-last` → a flush
  segmented control anchored at the bottom of the column (thumb reach), not a second
  floating card. Desktop keeps it on top.

Because `TransferCard` content is already `@container` and `SendQueue`/`ReceiveIdle`
already ship roomy `@md` variants, full-bleed width triggers those spacious layouts for
free. The redesign is mostly _removing constraints_.

## Risks / Trade-offs

- **Drawer trades one-tap tab-switching for a two-step open→tap.** → Accepted: this is a
  transfer-first app; Devices/Activity/Settings are occasional, so a permanent bottom
  strip was poor real-estate use. The edge-swipe keeps switching fast.
- **Editing the vendored `sidebar.svelte` diverges from a future shadcn-svelte
  `sidebar` update.** → Small, localized to one branch; documented here. Acceptable under
  the own-the-component model.
- **iOS WKWebView may still reserve a system left-edge gesture even without app
  back.** → Mitigate by starting the sensor from a narrow hot-zone and testing on-device;
  fall back to hamburger-only on iOS if it conflicts (single `if`, no fork).
- **Removing `nav.svelte.ts` touches the Android hardware-back handler.** → Keep the
  overlay-dismiss branch (already dispatches Escape), remove only the depth branch; verify
  back closes the drawer, then the app.
- **Chrome-dissolve could regress the drop-target visuals on desktop.** → The
  `max-sm:` prefixes leave desktop classes intact; `data-file-drop-target` is unchanged.

## Migration Plan

Frontend-only, no data or API migration. Land in reviewable slices:

1. `AppHeader` merge + single `Sidebar.Provider` in `+layout` (still Sheet on mobile).
2. Delete `BottomNav`, `nav.svelte.ts`, back buttons, tabbar-clearance CSS; simplify
   Android back.
3. Desktop icon rail (`collapsible="icon"`).
4. Sidebar mobile renderer Sheet → vaul Drawer.
5. `use:edgeSwipe` action, touch-gated.
6. Transfer screen chrome-dissolve.

Rollback is per-slice via git; no persisted state changes.

## Open Questions

- Does the on-device iOS WKWebView intercept the left-edge swipe (Decision 3 risk)? Resolve
  by testing before committing to un-gated iOS swipe.
- Should the rail-collapsed desktop sidebar persist its state across launches, or always
  start expanded? (Leaning: always expanded; revisit if requested.)
