## Context

Mobile navigation today is `sidebar.svelte`'s `isMobile` branch: a vaul
`Drawer` with `direction="left"`, opened by a snap gesture from a reserved 24px
left strip, closed by dragging the drawer panel, tapping the scrim, choosing a
destination, or hardware back.

Four things were checked in the library and the built CSS before writing this,
and each one rules out a fix-in-place:

1. **The drawer cannot be dragged shut from the scrim.**
   `use-drawer-overlay.svelte.js` binds exactly one handler — `onmouseup:
   ctx.onRelease`. The pointer handlers that drive the drag
   (`onpointerdown`/`move`/`up` → `ctx.onPress`/`onDrag`/`onRelease`) live only on
   the content node, in `use-drawer-content.svelte.js:66,95,115`. So the ~25% of
   the viewport that is scrim is drag-dead by construction.
2. **The drawer cannot be opened by a tracked drag.** vaul's pointer handling
   only exists while the drawer is already open, which is why
   `edge-swipe.svelte.ts:14-16` documents the open as a snap. There is no public
   way to hand it an in-flight opening gesture.
3. **The drawer's configured width is dead code.** In
   `build/_app/immutable/assets/0.Cx4YhOSy.css`,
   `…[data-vaul-drawer-direction=left]{width:75%}` (class + attribute selector,
   specificity 0,2,0) beats `.w-\(--sidebar-width\)` (0,1,0). tailwind-merge keeps
   both because a variant-prefixed utility and a bare one are different scopes.
   `SIDEBAR_WIDTH_MOBILE = "18rem"` has never applied. This is the third
   occurrence of that trap in this repo — `AppSidebar.svelte:149-157` documents
   it for the separator.
4. **vaul has no push mode.** `shouldScaleBackground` is the bottom-sheet scale
   effect and is already disabled here. Mirroring the drag onto the shell is
   possible (`Drawer.Root` exposes `onDrag(event, percentageDragged)`), but it
   means syncing a second animation against vaul's `TRANSITIONS = {DURATION:
   0.5, EASE: [0.32,0.72,0,1]}` and living with the transform-containing-block
   consequences.

The drawer also taxes the rest of the app: `EDGE_STRIP` reserves the left 24px,
and every other horizontal gesture must refuse it via `notEdgeStrip`.

Separately, `app.mode` (`transfer-app.svelte.ts:261`) selects which panel the
Transfer route shows. Every site that sets it **also navigates**, which is the
observation this design turns on.

## Goals / Non-Goals

**Goals:**

- Mobile navigation with no gesture surface to get wrong, and no reserved edge
  strip taxing other gestures.
- Delete the vaul dependency for navigation and return `sidebar.svelte` to the
  registry, retiring its six-item patch comment and the width trap with it.
- Reclaim the 60px the mobile mode switcher costs the file grid, so adding a nav
  bar is net-neutral chrome rather than net-worse.
- Keep navigation flat — no in-app history-back, per `app-shell` requirement
  "The shell has no in-app history-back".
- One source of truth for destinations (`nav-items.ts`) feeding bar, sidebar,
  page title, and preview markers.

**Non-Goals:**

- A route-level swipe pager across the four destinations. Deleting the drawer and
  splitting Transfer is already a large change; a pager needs route transitions
  and is a separate idea. Noted as a follow-up.
- Any hierarchy or sub-routes. Dropping Activity is what keeps nav flat; see
  Decision 7.
- Backend work. No Rust command, event, or IPC binding changes.
- Redesigning the Send or Receive panels. They move routes; their internals do
  not change.
- Desktop navigation. The sidebar keeps its collapsible icon rail unchanged
  above 768px.

## Decisions

### 1. Bottom bar, not a fixed overlay — an in-flow flex sibling

The shell is already `Sidebar.Provider class="h-svh min-h-0! flex-col"` with
`AppHeader` then a `flex-1` row. The bar becomes a third flex child:

```
Sidebar.Provider  (h-svh flex-col)
├─ AppHeader                sticky z-60
├─ div.flex-1               AppSidebar (>=768) + Sidebar.Inset
└─ BottomNav                (<768) shrink-0, pb-(--safe-bottom)
```

Why in-flow over `position: fixed`:

- **No z-order contention.** `AppHeader` is already `z-60`, which sits *above*
  dialog content at `z-50`. Adding a second fixed combatant to that ordering is
  how the header's `pointer-events-auto` workaround
  (`AppHeader.svelte:51-57`) came to exist. An in-flow bar has no z-index at all.
- **No bottom padding to keep in sync.** A fixed bar means every scroll region
  needs matching bottom inset, forever, on every new route.
- **The `min-h-0` chain already works.** Content height shrinks naturally.

`Sidebar.Inset`'s `pb-(--safe-bottom)` moves to the bar, which now owns the
floor.

*Alternative considered:* fixed bar with a spacer element. Same padding-sync
problem, plus a spacer that can drift out of step with the bar's real height.

### 2. Width-driven at 768, reusing `IsMobile`

The bar appears below `IsMobile`'s existing 768px threshold, not on
`isPhoneChrome`.

This is load-bearing, not a preference. `sidebar.svelte:65` branches on
`sidebar.isMobile` internally, so a platform-gated bar would leave the vaul
drawer rendering in narrow desktop windows — and then **nothing gets deleted**.
Width-driven is what makes the drawer genuinely dead.

It also matches what the threshold already means: `is-mobile.svelte.ts:7-12` says
768 answers "is there room for a permanent rail beside the content". Below it
there is no room, whatever the platform.

No fourth signal is introduced. `platform.ts:1-18` exists specifically to stop
that from happening; its note is amended to say the nav threshold is now
bar-vs-rail.

### 3. Revert `sidebar.svelte` to the registry, by not mounting it

Rather than patch the file further, `+layout.svelte` stops mounting
`<AppSidebar>` below 768. That makes the vaul branch **unreachable**, so the file
can go back to the registry version.

`Sidebar.Provider` stays mounted at every width — it owns `Sidebar.Inset`, and
`AppHeader` calls `useSidebar()`.

The sidebar context's mobile half (`openMobile`, `setOpenMobile`, `isMobile`)
becomes vestigial registry code. Left alone deliberately: it is upstream's, it is
inert, and touching it re-opens the patch problem this decision closes.

*Alternative considered:* keep the patched file and comment the branch as dead. A
25-line "load-bearing, easy to lose in a re-apply" comment guarding unreachable
code is a tax on every future `shadcn-svelte update sidebar`.

### 4. `app.mode` is deleted, because it was shadowing the router

Every consumer already paired the state write with a navigation:

| Site | Today | After |
| --- | --- | --- |
| `pairing-app.svelte.ts:136-137` accepted offer | `app.mode='receive'` + `goto('/')` | `goto('/receive')` |
| `pairing-app.svelte.ts:65-66` pairing accepted | `goto('/')`, implicitly relying on mode==='send' | `goto('/send')` |
| `transfer-app.svelte.ts:316` deep link | `this.mode='receive'`, **no goto** | `goto('/receive')` |

Two statements collapse into one at each jump site, and the second row's implicit
dependency becomes explicit.

The third row is a **bug being fixed in passing**: a `floppy://receive?code=…`
link arriving while the user is on `/devices` sets the mode and prefills the code
with no navigation, silently arming a panel nobody is looking at. Routing makes
that state unreachable.

The `Mode` type (`'send' | 'receive'`) survives — it is the transfer *kind*,
carried by every event payload and consumed by `describeError(msg, kind)`. Only
the app-state field goes.

### 5. `/` redirects to `/send`

`routes/+page.ts` does `redirect(307, resolve('/send'))`. `ssr = false`
(`+layout.ts:5`), so this resolves client-side under adapter-static's SPA
fallback.

*Alternative considered:* make `/` *be* Send. Rejected — the nav item hrefs would
read `/` and `/receive`, which is asymmetric and makes the active-state
comparison a special case.

### 6. Per-side transfer errors, plus a bar dot

`app.error` is one global field (`transfer-app.svelte.ts:262`) rendered on the
shared Transfer page. With split routes, a send failure while the user is on
`/receive` renders where nobody is looking.

Each side owns its error. `describeError(e.payload.message, e.payload.kind)`
already receives the kind, and the reset at `:322-325` is already per-kind, so
the split follows the existing grain.

The bar dots the other tab when that side holds an error, so a failure is
discoverable from any route. This is strictly better than today: the current
switcher spinner (`ModeSwitcher.svelte:30`) is only visible if you are already on
the Transfer page, whereas the bar is on every route. The Devices count badge
gains the same property.

### 7. Activity is dropped, and that is what keeps navigation flat

Making Activity a sub-page of Settings would break a flat-nav invariant
documented in three places — `+layout.svelte:66-70`, `AppHeader.svelte:13-15`,
and `nav-items.ts:35` ("Every route is a leaf, so an exact match is enough").
The cost was an Android back branch, an iOS back affordance, prefix-matched
active state, and prefix-aware `titleFor`/`isStub`.

Dropping it avoids all of that. It is safe to drop:

- Nothing outside `components/activity/` and `routes/activity/` imports it.
- `loadActivity` returns hardcoded sample data. There is no command, no event, no
  persistence.
- Its own roadmap comment (`activity.ts:10-12`) says history will "graduate to
  the Go side" — an architecture that no longer exists (per project context,
  the Go app-core is gone; only the broker remains). The file's plan is stale.

With Activity gone the bar carries exactly the four `nav-items.ts` entries, so
**no `bar` flag is needed** — the array feeds bar, sidebar, and title unchanged.

### 8. Pull-to-refresh moves to Devices rather than being deleted

`routes/activity/+page.svelte:20` is the only `onrefresh` consumer in the
codebase, so dropping Activity would strand `pull-to-refresh.svelte.ts` and
`PageShell`'s whole pull apparatus.

`devices/+page.svelte:134` is already `<PageShell scroll>` and
`pairing.refresh()` already exists, so the gesture gets a real,
non-preview consumer for one line of wiring. Better than deleting a working
capability as collateral damage.

### 9. Mode switcher deleted; shortcuts generalise

`ModeSwitcher.svelte` goes entirely, including the `Tabs` wrapper, `enterDir`,
`MODES`, `targetFor`, `dragX`, and the pager in the old `+page.svelte`.

Its `⌘1`/`⌘2` handler becomes `⌘1`–`⌘4` over `nav-items.ts`, in `+layout.svelte`
— global, so it works from every route, and it cannot drift from the destination
list.

This also deletes a latent bug rather than fixing it:
`+page.svelte:111`'s `class:transition-transform={dragX === 0}` adds the
transition in the same flush as the value change, so `transition-property` was
`none` in the before-state and the spring-back never animated.

### 10. Account status stays out of the mobile chrome

The bar's Settings slot is a gear labelled "Settings". Sign-in status lives
inside the Settings page's Account section.

A bar tab is icon-only, and the avatar has no image to show: `AppSidebar.svelte:178-181`
deliberately never fetches one ("at odds with the app's peer-to-peer, no-cloud
promise"), so signed-in and signed-out would render the same glyph. The desktop
row conveys status through *text*, which a tab has no room for.

Both platform conventions treat tab items as destinations and reserve badges for
new content needing attention, not persistent account state. Apps that put a face
in a tab have a real photo; that is identity, not status.

Reserving a slot of the primary navigation for a stub, in an app whose broker is
accountless, would also over-weight a feature that does not exist yet.

The sidebar account row survives on desktop as a **link** to `/settings` rather
than a dialog trigger, and `LoginView` moves into `SettingsView`.

### 11. Two sidebar rows point at `/settings`

The nav row and the account row share a destination, so the exact-match active
state at `AppSidebar.svelte:94` would light both. The account row does not take
`isActive`; it is an account affordance that happens to navigate, not a second
entry in the destination list. That reading is already what
`app-shell`'s "The account row is separated from the destination list"
requirement asserts.

### 12. Mobile drops the top app bar entirely

Once the bar shows the current destination, the mobile app bar holds only a
title, and the title is already on every screen: `TransferCard` renders it for
`/send` and `/receive`, `PageHeader` for `/devices` and `/settings`. So the
`isPhoneChrome` branch of `AppHeader` is removed and mobile runs full height.

This moves *toward* platform convention rather than away. `PageHeader`'s
`text-2xl font-semibold` heading in the scroll region is the large-title pattern;
a separate fixed bar restating the same word is the redundancy.

`--bar-height` is `spacing * 13` = 52px, so with the mode switcher's 60px this
reclaims ~112px on the file grid, against ~56px spent on the bottom bar.

Four rewires, all mechanical:

| Consumer | Change |
| --- | --- |
| `AppSidebar.svelte:58` `top-(--header-height)!` | none — the sidebar is desktop-only and desktop keeps its header |
| `+layout.svelte:158` Toaster `mobileOffset` | `calc(var(--safe-top) + var(--spacing) * 2)` |
| `--safe-top` ownership | `Sidebar.Inset` gains `pt-(--safe-top)`; it already carries the other three insets |
| `layout.css:262` `:not([data-mobile])` | simplifies — the drawer that exclusion existed for is gone |

`titleFor` becomes dead and is deleted from `nav-items.ts`. Its only caller was
`AppHeader.svelte:6,20`, inside the removed branch; the desktop header renders no
title.

Padding rather than a transparent overlay is deliberate: content never enters the
`--safe-top` zone, so nothing scrolls under the clock and the strip simply shows
`bg-background`. `--header-height` stays defined — desktop still uses it, and
portaled overlays still offset against it there.

### 13. Navigation never blocks, and the bar never hides

Leaving `/send` mid-transfer does not cancel the transfer. `app` is a module
singleton (`transfer-app.svelte.ts:336`) and `app.listen()` runs once in the
layout, which `+layout.svelte:35-36` states is deliberate: the streams "survive
navigation between routes". Cancellation happens only on an explicit
`send.cancel()` / `receive.cancel()`.

So there is nothing to guard against, and no reason to gate navigation on a
running transfer. Gating would also be wrong on its own terms — it would trap
someone in a route for the length of a large transfer, when always-available
navigation is the point of the bar.

The bar therefore stays visible on every route in every state, including during a
transfer. This is what makes the per-side error dot and the busy indicator worth
having: the transfer is observable from wherever the user happens to be.

*Alternative considered:* dissolving the bar during a transfer to give progress
the full viewport, in the spirit of the archived `unify-responsive-shell`
chrome-dissolve. Rejected — a navigation bar that disappears is one users stop
trusting, and the transfer panels already fill their route.

### 14. No swipe pager between bottom-bar destinations

Lateral swipe between tabs is a *top*-tab pattern (Material `TabLayout` /
ViewPager). Material's bottom-navigation guidance advises against it for
bottom-bar destinations, and iOS tab bars do not support it at all.

The reasoning holds here specifically: top-level destinations are unrelated, so a
lateral swipe carries no spatial meaning, and it would compete with in-content
gestures — which is exactly how the Send/Receive pager this change removes came
to need a 24px reserved strip and a vertical-intent release rule.

This is a decided no rather than a deferral. `SwipeRow` becomes the permanent sole
consumer of `horizontalSwipe`, so that module's arbitration-order framing is
narrowed to what it actually still does.

### 15. The card's status headline becomes visible on mobile

`TransferCard.svelte:98-99` hides `Card.Description` below `sm` with the
reasoning: "on a phone the mode switcher above and the badge already say where you
are". The mode switcher is deleted by decision 9 and the app bar by decision 12,
so that justification is mostly gone.

The hidden element is the state line (`sendHeadline(status, target, count)` —
"Preparing your files", "Waiting for them…"), not a restatement of the mode. With
112px reclaimed and one row to spend, `max-sm:hidden` comes off.

*Alternative considered:* leave it hidden and let the badge carry state. Rejected —
the badge is a short token, the headline is the sentence, and the whole reason the
line was hidden was redundancy with chrome that no longer exists.

## Risks / Trade-offs

**Four tabs plus a stub marker on a 44px target could crowd.** → `touch-targets`
already requires 44px minimums and that navigation controls "grow rather than
slop". Four slots on a 393px phone is ~98px each, which is roomy; the preview dot
reuses the existing `StubMark` placement rather than inventing a new corner.

**Send and Receive as sibling destinations flattens a real hierarchy** — they are
two ends of one feature, now listed next to Settings. → Accepted deliberately.
They are the two things people actually open the app to do, they are the two most
frequent destinations by a wide margin, and the alternative (keeping the
switcher) costs the file grid 60px permanently.

**Losing the swipe between Send and Receive is a felt regression** for anyone who
found it. → The switcher was already thumb-reachable, and the bar is more so.
The gesture was also the worse of the two paths: single-mount meant it dragged
one panel over empty background with nothing to preview, which is the finding
that started this change.

**Reverting `sidebar.svelte` could lose a patch that was load-bearing for
something not listed in its comment.** → The comment enumerates five items, all
of them inside the vaul branch, which becomes unreachable. The sixth (the width
override) is the trap this change removes. Verify on desktop at every width after
reverting; the desktop branch of that file is untouched by the patch.

**The bar is a new nav surface with no automated coverage.** → The browser preview
at :1420 cannot exercise `invoke()`/`listen()`, so safe-area floor, reach, and hit
areas only mean anything on hardware. Verification is on-device on both Android
and iOS, not a test gate.

**Deleting Activity discards a built 169-line timeline view.** → It renders
hardcoded samples and is marked `stub`. Git retains it. If history graduates to a
real backend, the view returns with a real data source rather than a stale plan
pointing at a removed architecture.

**Vestigial sidebar-context mobile state may confuse a future reader.** → It is
registry code and inert. The alternative — pruning it — reintroduces the vendored
patch this change is removing.

## Migration Plan

No data or protocol migration; this is frontend-only and ships in one commit
range.

Sequencing matters in one place: **do not revert `sidebar.svelte` until
`+layout.svelte` stops mounting `AppSidebar` below 768.** Reverting first makes
the mobile drawer a plain Sheet with no close gesture at all — worse than today —
for the duration of the intermediate state.

Rollback is `git revert`. There is no persisted state keyed to the old routes;
`app.mode` was in-memory only.

## Open Questions

None blocking. The three that were open — whether the bar hides during a
transfer, whether the mobile app bar still earns its place, and whether a route
pager follows — are resolved as decisions 13, 12, and 14.

One thing only hardware can answer: whether four labelled tabs read comfortably
at ~98px per slot on a small phone, and whether dropping the top bar leaves the
`--safe-top` strip looking intentional or merely empty on both Android and iOS.
Neither changes the design; both are checks during on-device verification.
