## Why

The mobile nav drawer is the weakest surface in the app, and every attempt to fix
it in place runs into the same wall. It overlays content instead of pushing it,
its drag-to-close only works on the drawer itself (vaul binds pointer handlers to
the content node, and its overlay gets `onmouseup` only), its opening is a snap
rather than a tracked drag (vaul's drag handling only exists once the drawer is
already open), and its width silently ignores the `18rem` it is configured with
because a variant-prefixed `w-3/4` from the registry outranks the override. It
also costs the rest of the app a reserved 24px left strip that every other
horizontal gesture has to refuse.

A bottom navigation bar deletes all of those problems rather than fixing them,
and it is the pattern the app's four flat destinations already want.

Splitting Transfer into `/send` and `/receive` falls out of the same move. The
mobile mode switcher is a 60px bar at the bottom of the screen; adding a nav bar
under it would stack two bars over the file grid. Folding the two modes into
navigation reclaims that space and makes the chrome net-neutral. It also removes
`app.mode`, a state field that was already shadowing the router: every place that
sets it also calls `goto()`.

## What Changes

- **Mobile navigation becomes a bottom bar** carrying the four destinations:
  Send, Receive, Devices, Settings. In-flow as a flex sibling of the shell, not
  `fixed`, so it never contends with overlay z-order and owns the
  `--safe-bottom` floor.
- **The sidebar becomes desktop-only**, gated on the existing 768px `IsMobile`
  threshold (width-driven, so a narrow desktop window gets the bar too). No new
  platform signal is introduced.
- **`sidebar.svelte` reverts to the shadcn-svelte registry file.** Not mounting
  `AppSidebar` below 768 makes its vaul branch unreachable, retiring a six-item
  "load-bearing" patch comment and the `w-3/4` merge trap with it.
- **BREAKING: Transfer splits into `/send` and `/receive`.** `/` redirects to
  `/send`. `app.mode` is deleted; the three jump sites (deep link, accepted
  offer, accepted pairing) become plain `goto()` calls.
- **`ModeSwitcher` is removed.** Its `⌘1`/`⌘2` shortcuts generalise to `⌘1`–`⌘4`
  over `nav-items.ts`, in the layout.
- **BREAKING: the Activity feature is dropped** — route, view, and its sample
  data module. It was never wired to anything; its own roadmap comment points at
  a Go app-core that no longer exists.
- **Pull-to-refresh moves to the Devices list.** Activity was its only consumer;
  rather than delete the gesture as collateral it gets its first real
  (non-preview) home via `pairing.refresh()`.
- **Transfer errors become per-side.** `app.error` is one global field rendered
  on the shared Transfer page; with split routes a send failure would render
  where nobody is looking. Each side owns its own error, and the bar dots the
  other tab so a failure is discoverable from any route.
- **The left-edge swipe and the Send/Receive pager are removed**, along with
  `edge-swipe.svelte.ts`, `NavEdgeSwipe.svelte`, and the `EDGE_STRIP` /
  `notEdgeStrip` reservation. `SwipeRow` gets its left 24px back.
- **Sign-in stops being a dialog.** The sidebar account row links to
  `/settings`, and `LoginView` moves into the Settings page as an Account
  section.
- **Mobile carries no account affordance in its chrome.** The bar's Settings slot
  stays a gear labelled "Settings", and sign-in status is shown inside the
  Settings page. A bar tab is icon-only, and the avatar has no image to show:
  `AppSidebar` deliberately never fetches one, so signed-in and signed-out would
  render the same glyph. Desktop keeps its account row because it conveys status
  through *text*, which a tab has no room for. Reserving a slot of the primary
  navigation for a stub, in an app whose broker is accountless, would also
  over-weight a feature that does not exist yet.
- **BREAKING: the mobile top app bar is removed and mobile runs full height.**
  Once the bar names the current destination the app bar holds only a title, and
  every screen already has one — `TransferCard` for `/send` and `/receive`,
  `PageHeader` for `/devices` and `/settings`. That is also the large-title
  convention: the heading belongs in the scroll region, not a fixed bar restating
  it. `--safe-top` moves to `Sidebar.Inset`, the toast `mobileOffset` retargets,
  and `titleFor` is deleted as dead. Reclaims 52px on top of the switcher's 60px.
  The desktop titlebar is untouched.
- The brand row needs no work: the sidebar is desktop-only, so the brand is
  desktop-only by construction.
- **The bar is always visible, and navigation never blocks.** Leaving a transfer's
  route does not cancel it — `app` is a module singleton and its event streams
  live in the layout precisely so they survive navigation. So there is nothing to
  gate, and the running transfer stays observable from any route through the bar.
- Navigation **stays flat**. Dropping Activity is what buys this: the app keeps
  its "no in-app history-back" invariant, and no back subsystem, prefix-matched
  active state, or per-platform back affordance is needed.

## Capabilities

### New Capabilities

None. Bottom navigation replaces the drawer inside the existing
`mobile-navigation` capability rather than standing up a new one — the question
that capability answers ("how does navigation work on a phone") is unchanged;
only the mechanism is.

### Modified Capabilities

- `mobile-navigation`: all five requirements are drawer-specific and are
  replaced. The bar's destinations, active state, badges, safe-area floor,
  one-handed reach, and the absence of any drawer or edge gesture.
- `swipe-gestures`: removes the Send/Receive pager requirement and the drawer's
  exclusive left-edge strip. Retargets the pull-to-refresh requirement from the
  activity timeline to the device list. The arbitration-order requirement
  simplifies — `SwipeRow` becomes the only consumer of the shared engine.
- `app-shell`: the sidebar is desktop-only; mobile has no top app bar at all, so
  the header requirement covers desktop chrome only and the safe-area requirement
  reassigns `--safe-top` to the content inset; the account row navigates instead
  of opening a dialog. The platform-signals requirement is amended because the
  768px threshold now means bar-vs-rail. The "no in-app history-back" requirement
  is unchanged and reaffirmed.
- `transfer-panel-layout`: removes the mobile mode switcher requirement. The
  card-chrome-dissolve requirement now applies to two routes rather than two
  tabs.
- `interface-motion`: mode-change animation becomes route-change animation.
  Removes the activity timeline's loading-skeleton and empty-state requirements.
- `preview-markers`: Activity was one of two preview destinations; only Settings
  remains. The bottom bar needs its own preview affordance, replacing
  `Sidebar.MenuBadge`.

## Impact

**Removed:** `src/routes/activity/`, `src/lib/components/activity/`,
`src/lib/components/transfer/ModeSwitcher.svelte`,
`src/lib/actions/edge-swipe.svelte.ts`,
`src/lib/components/shell/NavEdgeSwipe.svelte`, `app.mode`, `EDGE_STRIP` /
`notEdgeStrip`, the pager block in the old `+page.svelte`, the sign-in dialog in
`AppSidebar`, `ArrowLeftRightIcon` and `Clock3Icon` from `nav-items.ts`, the
`isPhoneChrome` branch of `AppHeader.svelte`, and `titleFor`.

**Added:** a bottom-bar shell component, `src/routes/send/`,
`src/routes/receive/`, a `/` redirect, an Account section in `SettingsView`.

**Reverted to registry:** `src/lib/components/ui/sidebar/sidebar.svelte`.

**Modified:** `+layout.svelte` (bar mounting, `⌘1`–`⌘4`, back-handler selector
loses its drawer branch), `AppHeader.svelte`, `AppSidebar.svelte`,
`nav-items.ts`, `hooks/is-mobile.svelte.ts` (doc), `platform.ts` (doc),
`transfer-app.svelte.ts` (per-side errors, deep-link `goto`),
`pairing-app.svelte.ts` (two `goto` targets), `PageShell.svelte` (keeps
`onrefresh`, now used by Devices), `devices/+page.svelte` (wires
pull-to-refresh), `horizontal-swipe.svelte.ts` (doc — one consumer left).

**Fixed in passing:** a deep link arriving on another route set
`app.mode = 'receive'` and prefilled the code with no navigation, silently arming
a panel the user was not looking at. Routing makes that impossible.

**No backend impact.** No Rust commands, events, or IPC bindings change. The
transfer core, rendezvous, pairing, and broker are untouched, so `cargo test` and
`go test` gates are unaffected.

**Verification is on-device.** The browser preview at :1420 cannot exercise
`invoke()`/`listen()`, and the bar's safe-area floor, reach, and hit areas only
mean anything on real hardware.
