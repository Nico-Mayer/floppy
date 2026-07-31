## Why

The app runs one shell on desktop and a second, forked shell on mobile, picked by
`isMobile` (user agent) in `+layout.svelte`. The two disagree on navigation (desktop
sidebar vs. a mobile bottom tab bar), on chrome (WindowChrome vs. TopAppBar), and on
back behavior — so the same narrow screen gets two different navigation models and the
mobile UI reads as a shrunk desktop rather than something designed for a phone. We want
one responsive shell, a single navigation model, and a mobile Transfer screen that feels
intentional and one-handed, while keeping desktop unchanged or better.

## What Changes

- **One shell, no platform fork for structure.** Collapse the two branches of
  `+layout.svelte` into a single `Sidebar.Provider`. Platform only decides *header
  slots* (macOS traffic-light spacer + drag region, Windows min/max/close, mobile
  status-bar padding); width decides *navigation presentation*.
- **Single navigation model.** Desktop keeps a fixed sidebar, now **collapsible to an
  icon rail**. Touch/narrow gets the *same* sidebar as a left **drawer** (the stock
  shadcn Sheet), opened by a hamburger or an **edge-swipe** gesture.
- **BREAKING (internal): remove the mobile bottom tab bar.** Delete `BottomNav.svelte`
  and the `--bottom-nav-height` / `[data-tabbar-clearance]` machinery that only existed
  to clear it.
- **Drop in-app history-back entirely.** The app is flat — each destination stands on
  its own, no deep flows. Remove `nav.svelte.ts`, the header back buttons, and
  `afterNavigate(nav.record)`. Android hardware-back reduces to: dismiss an open overlay,
  else close the app.
- **Edge-swipe-to-open drawer**, driven by a thin `use:edgeSwipe` action that flips the
  sidebar's existing `openMobile` once a left-edge drag passes a threshold; the stock
  Sheet then animates in and owns the scrim, focus trap, and dismissal. Gated on
  `pointerType === 'touch'` (not on OS), so mouse users get the hamburger and touch users
  get the gesture with one code path.
- **Merge `TopAppBar` + `WindowChrome` into one `AppHeader`** with platform slots and a
  hamburger shown whenever the sidebar is collapsible.
- **Mobile Transfer screen dissolves its card chrome.** Below `sm` the `TransferCard`
  goes edge-to-edge (no border, shadow, radius, or outer page padding), the mode switcher
  becomes a **flush segmented control** under the header (no floating shadow), and the
  desktop-density header row (mono headline) slims. Feature parity is unchanged — same
  tabs, states, actions zone, drop target — only chrome thins. The panels' existing
  `@container` layouts then upgrade to their roomy variants for free.

## Capabilities

### New Capabilities
- `app-shell`: the single responsive application shell — one `Sidebar.Provider`, the
  unified `AppHeader` with per-platform chrome slots, desktop collapsible icon rail,
  touch/narrow drawer, safe-area handling, and the removal of the bottom tab bar and
  in-app history-back.
- `mobile-navigation`: the mobile navigation model — left-drawer menu reusing the sidebar
  content, edge-swipe-to-open (touch-gated) with hamburger fallback, collapse-on-navigate,
  and Android hardware-back reduced to overlay-dismiss-else-close.

### Modified Capabilities
- `transfer-panel-layout`: add the mobile chrome-dissolve requirement — full-bleed card,
  flush segmented switcher, slimmed header row below `sm` — while preserving the existing
  container-query, touch-target, mascot, and two-zone requirements.

## Impact

- **Frontend layout:** `src/routes/+layout.svelte`, `src/routes/layout.css`.
- **Shell components:** merge `TopAppBar.svelte` + `WindowChrome.svelte` → `AppHeader.svelte`;
  delete `BottomNav.svelte`; edit `AppSidebar.svelte` (rail on desktop).
- **Vendored UI:** `ui/sidebar/sidebar.svelte` mobile branch stays the stock shadcn
  `Sheet` (the vaul drawer was tried and reverted — see design). AppSidebar gates the
  desktop header-offset to `md:` so the mobile sheet is full-height.
- **Navigation:** delete `src/lib/nav.svelte.ts`; add `src/lib/actions/edge-swipe.svelte.ts`;
  extend `src/lib/platform.ts` with `isAndroid`/`isIos`.
- **Transfer screen:** `src/routes/+page.svelte`, `TransferCard.svelte`, `ModeSwitcher.svelte`.
- **No Rust/IPC/broker changes.** Pure frontend, no new runtime dependency.
