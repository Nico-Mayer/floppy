Slice order matters: group 1 lands before 2 and 5; group 5 lands before 6. Groups 3, 4, 7, and 8
float. Every group ends green (`npm run check` and `npm run lint`), so each is reviewable alone.

Nothing here is covered by an automated gate — the Vite preview at :1420 cannot `invoke()`, and
`cargo test` does not see the frontend. Group 9 is the verification pass and is not optional.

## 1. Platform vocabulary (D2)

- [x] 1.1 In `src/lib/platform.ts`, add `isTouch` from `matchMedia('(pointer: coarse)')` and
  rename the existing UA-based `isMobile` to `isPhoneChrome`, keeping `isMac`, `isWindows`, and
  `modKey` as they are. Document at the top what each of the three answers and what it must not
  be used for.
- [x] 1.2 Add a reactive `isNarrow` (width < 640, matching Tailwind `sm`) alongside the existing
  `IsMobile` hook. Do not change `IsMobile`'s 768 threshold; rename it to say it is the sidebar's
  drawer-versus-rail question, and note why it deliberately differs from `isNarrow`.
  **Deviation:** the class name stays `IsMobile`. Renaming it would have required patching
  `ui/sidebar/context.svelte.ts` as well, adding a second vendored divergence for a naming
  benefit only. The file now documents that it is the rail threshold and why it is 768, which is
  what the spec's "stays its own" scenario actually needs.
- [x] 1.3 Point `ui/responsive-dialog/context.ts` at `isNarrow` instead of its own private
  `MediaQuery`. Same threshold, one definition.
- [x] 1.4 Update every consumer of the old `isMobile`: `+layout.svelte`, `AppHeader.svelte`,
  `NavEdgeSwipe.svelte`, `ReceivePanel.svelte`. Each call site picks the axis it actually means —
  `ReceivePanel`'s hidden "Open folder" is `isPhoneChrome` (a platform capability), the
  `data-mobile` attribute is `isPhoneChrome`, the edge swipe is `isTouch`.
- [x] 1.5 Grep for any remaining `isMobile` identifier and confirm none survives.

## 2. Page shell (D3)

- [x] 2.1 Add `PageShell.svelte` with `scroll`, `width` (`prose` | `wide`), and `pad`
  (`default` | `tight`) props per the D3 table, owning the gutters, width cap, and scroll region.
  **Added a fourth prop, `gap`:** the rhythm between a header and its content is part of the same
  contract, and the reading pages all wanted `gap-6` while Transfer wants none (its tab root owns
  its own spacing).
- [x] 2.2 Give every `scroll` region `overscroll-behavior: contain`. The global `none` on `html`
  (`layout.css:242`) does not reach inner scrollers.
- [x] 2.3 Add `PageHeader.svelte` taking `title`, `description`, and `stub`, replacing the
  `h1` + `p` block currently copied in three routes.
- [x] 2.4 Convert `routes/devices/+page.svelte`, `routes/activity/+page.svelte`, and
  `routes/settings/+page.svelte` to `PageShell` (`scroll`, `prose`, `default`) + `PageHeader`,
  deleting their hand-written containers and heading blocks.
- [x] 2.5 Convert `routes/+page.svelte` to `PageShell` (no scroll, `wide`, `tight`) with no
  header, keeping the single `px-4` gutter the transfer card depends on.
- [x] 2.6 Confirm no route file contains a gutter, `max-w-*`, or `overflow-y-auto` class of its
  own. (Two remaining hits are legitimately not route layout: a `Card.Content` inner padding and
  a `ResponsiveDialog.Content` width.)
- [x] 2.7 **Found while converting:** `PageShell` renders a `div`, not a `main`, because
  `Sidebar.Inset` is already the page's `main` landmark. `routes/+page.svelte` used to render its
  own `<main>` inside that one, so the app was shipping nested `<main>` elements. Fixed by the
  conversion.

## 3. Touch targets (D1)

- [x] 3.1 Add a `touch` variant to `buttonVariants` in `ui/button/button.svelte`: `grow`
  (`pointer-coarse:min-h-11 pointer-coarse:min-w-11`), `slop`, and `none`.
  **Correction to the design:** slop is *not* a `-inset-[6px]`. A fixed inset expands by a
  constant, which leaves a 24px `icon-xs` control at 36px and misses the minimum. It is instead a
  centred `::after` sized `h-full w-full min-h-12 min-w-12`, so the hit region is at least 48px in
  each axis and never smaller than the button. `design.md` D1 and the `touch-targets` spec were
  both corrected, including the clearance figure, which is derived (12px for a 24px control, 6px
  for a 36px one) rather than a flat 6px.
- [x] 3.2 Add the compound defaults so the variant is inferred, not requested: `default`, `lg`,
  `icon`, `icon-lg` → `grow`; `xs`, `sm`, `icon-xs`, `icon-sm` → `slop`; any size with
  `variant="destructive"` → `grow`. The slop rule enumerates the non-destructive variants so the
  two rules can never both match one button.
- [x] 3.3 Give `ui/sidebar/sidebar-menu-button.svelte` its own coarse-pointer minimum, since it
  is not built on `buttonVariants`. **Scoped to `max-md:` rather than `pointer-coarse:`:** at
  `md` and up this component collapses to a square `size-8!` icon rail, and a coarse minimum
  would stretch those tiles out of square on a touchscreen laptop. Known gap recorded in the file.
- [x] 3.4 Delete the now-redundant hand-patched overrides: `@max-md:min-h-11`
  (`SendPanel.svelte:132,137`, `ReceivePanel.svelte:63,68,72`) and `class="h-11 md:h-9"`
  (`AppSidebar.svelte:60`).
  **`AppHeader.svelte:27`'s `size-8` was kept, not deleted:** it is not redundant. It is the
  desktop density choice (32px), and deleting it would grow the desktop menu button to 36px,
  breaking "fine pointer keeps desktop density". The coarse `min-w/h-11` still wins on touch, so
  the same button is 32px with a mouse and 44px with a finger.
  The two reset buttons (`Send something else`, `Get more files`) got `touch="grow"` explicitly:
  they are each the only way forward from the done state, so they are their surface's primary
  action, which the size alone cannot express.
- [x] 3.5 Make the incoming-offer and incoming-pair actions large and stacked on narrow widths.
  **Simpler than planned:** the drawer footer already stacks and stretches its children, and
  `size="default"` already grows to 44px on coarse, so neither a size nor a width change was
  needed. What was missing was separation: `max-sm:gap-4` puts 16px between accept and decline
  instead of the stock 8px, with accept last so it sits closest to the thumb.
- [x] 3.6 Audit every slopped control for clearance and adjacency.
  **Found and fixed a regression I introduced:** `InputGroup.Button` sizes itself through `class`,
  not through Button's `size`, so the Button underneath saw `size="default"` and inferred *grow* —
  a 44px minimum inside a 36px field, which blows the field open. It now passes `touch="slop"`.
  The other three Button-wrapping registry components (`sidebar-trigger`, `dialog-content`,
  `sheet-content`) all pass an explicit `size="icon-sm"` and are unaffected.
  Remaining slop sites all clear: code clear/copy (inside an unclipped `InputGroup`), alert
  dismiss (no clipping ancestor), "New code" (solitary). The one adjacent pair on the Devices page
  is two `icon`-size buttons, which grow.
- [x] 3.7 Confirm the receive and pairing code inputs render at 16px or larger on coarse
  pointers. **Was broken above `md`:** `input.svelte` had a flat `md:text-sm`, so an iPad (wider
  than `md`, coarse pointer) got 14px and iOS would zoom on focus. Changed to
  `md:not-pointer-coarse:text-sm`, so 16px holds on every coarse pointer at any width. Verified
  in the built CSS as `@media not all and (pointer:coarse)`.
- [x] 3.8 **Found while auditing 3.6, and agreed as a scope addition:** every form control was
  below the minimum on touch — `input` and `input-group` at 36px, `select-trigger` at 36/32px.
  All three now carry `pointer-coarse:min-h-11`. This also gives an inline `InputGroup.Button`
  enough room that its 48px slop stays inside the field instead of spilling into the gap below.
  Desktop rendering is unchanged.
- [x] 3.9 Verify the generated CSS actually contains the new rules, since a variant that does not
  compile is a silent no-op: `pointer-coarse:min-h-11`, `min-w-11`, the full centred-`::after`
  slop set, and `md:not-pointer-coarse:text-sm` are all present in the production build.

## 4. Preview markers (D6)

- [x] 4.1 Add `stub?: true` to the `/activity` and `/settings` entries in `lib/nav-items.ts`,
  plus an `isStub(pathname)` helper so a route reads its own flag rather than restating it.
  `stub` is set on every entry (`false` where it does not apply) because the array must stay
  `as const` for SvelteKit's typed `resolve()`, and a partially-present property on a const tuple
  cannot be read without narrowing at every call site.
- [x] 4.2 Add `StubMark.svelte`: an icon-only badge with a tooltip saying the screen is a preview
  and is not wired up yet. The trigger is focusable on purpose — that is what makes it reachable
  on a phone, where a tap focuses it and there is no hover.
- [x] 4.3 Render `StubMark` from `PageHeader` when `stub` is set, and a quiet dot on the
  matching `AppSidebar` row. The dot shares the one `MenuBadge` slot with the device count rather
  than stacking on the same corner, and the badge is re-centred on the taller touch row
  (`max-md:top-1/2!`, overriding the component's own `top-1.5`, which is tuned for 36px). A
  preview row states it in its `aria-label` rather than via an extra element, because the row has
  to stay `<a><icon/><span>label</span></a>` or the icon rail cannot hide the label.
- [x] 4.4 Mark the sign-in dialog's title. The row itself **stays** — account-backed device sync
  is planned, so this is a preview of something real. Both the row and the dialog are marked
  `Planned` rather than `Preview`, which reads truer for something not yet built. Row copy
  shortened to "Sync your devices", with no claim about the broker holding accounts.
- [x] 4.5 Remove the dicebear `Avatar.Image` src, leaving the local icon fallback. No preview
  surface may call an external service. Verified: no `dicebear` reference remains in `src`.
- [x] 4.6 Delete the "Save files to" field. It asserts `~/Downloads`, which is wrong on every
  mobile target — the real root is resolved per platform in `lib.rs:502-511`. A comment in its
  place records why, so it is not re-added.
- [x] 4.7 Delete the "Give each transfer its own folder" switch. The datetime folder is
  unconditional (`manager.rs:77`), so the switch offers a choice that does not exist.
- [x] 4.8 Replace the `www.relay-floppy.com` placeholder with "Your relay's address", which
  cannot be mistaken for a live default.

## 5. Gesture engine (D4)

- [x] 5.1 Add `actions/horizontal-swipe.svelte.ts` with the `claim` / `onProgress` / `onCommit` /
  `onCancel` / `threshold` / `velocity` / `enabled` API, generalising the tracking already in
  `edge-swipe.svelte.ts` rather than writing a second engine beside it.
  Three options were needed beyond the planned set, each because a consumer could not work
  without it: `distance` (absolute px instead of a width fraction), `surface` (whether
  `pointerdown` is heard on the node or the window), and `commitOnCross` — see 5.4.
- [x] 5.2 Implement the arbitration in the D4 order: ignore non-touch pointers; reserve the left
  24px; lock direction after 10px and release to scroll **permanently** for that pointer; commit
  on threshold fraction of width or on velocity; otherwise spring back. Velocity is measured over
  the recent part of the drag with a whole-gesture fallback, so a slow pull ending in a flick
  reads as a flick even if it produced only one move event.
- [x] 5.3 Export one `notEdgeStrip(e)` helper holding the 24px reservation, and have every
  non-drawer consumer call it from its `claim`. The reservation must exist once.
- [x] 5.4 Rewrite `edge-swipe.svelte.ts` on top of the shared action. It survives as a thin
  wrapper: what is specific to it is only the claim (reserved strip, rightward travel).
  **Two regressions caught while porting it**, both from assuming the node is a normal box:
  its node is `class="hidden"`, so a node-scoped `pointerdown` would never fire (hence `surface:
  'window'`) and a width-fraction threshold would divide by zero and commit on the first pixel
  (hence `distance`). And the original committed *during* the drag at 40px, not on release, so
  `commitOnCross` preserves that — the drawer snaps rather than tracking, so waiting for the
  finger to lift would be pure added latency.

## 6. Gestures and drawer (D4, D5)

- [x] 6.1 Swap the mobile branch of `ui/sidebar/sidebar.svelte` from `Sheet` to
  `Drawer.Root direction="left"`, with `shouldScaleBackground={false}`. `direction` is fed from
  the component's existing `side` prop, so a right-hand sidebar still works.
- [x] 6.2 Keep `data-slot="sidebar"` **and** `data-mobile="true"` on the drawer content. The
  Android back handler matches on both.
- [x] 6.3 Carry over the `sr-only` title as a `Drawer.Title` (plus description); vaul warns
  without one. Dropped the Sheet-only `[&>button]:hidden`, which existed to hide a close button
  vaul's content does not render.
- [x] 6.4 Replace the sheet-only safe-area rule with one matching
  `[data-vaul-drawer-direction='left'|'right']`.
  **Fixed a pre-existing bug while doing it:** the rule adds `padding-top: var(--safe-top)`, but
  the nav drawer is offset to `top: --header-height`, which *already contains* `--safe-top`. The
  Sheet had the same double-count, leaving a notch-sized gap above the first menu row. The nav
  drawer is now excluded via `:not([data-mobile])`; its bottom inset still comes from
  `Sidebar.Footer`'s own `pb-(--safe-bottom)`.
- [x] 6.5 Confirm `AppSidebar`'s `top-(--header-height)!` and `h-[calc(...)]!` overrides still
  land on a `fixed inset-y-0` left drawer. They do: top and height with `!important` win, and an
  over-constrained absolute box drops `bottom`.
- [x] 6.6 Add a comment marking `sidebar.svelte` as intentionally divergent from the registry.
  It lists the four things a re-apply must not lose and points at design D5.
- [x] 6.7 Delete the stale comment in `AppHeader.svelte` claiming the nav sheet covers the app bar
  and menu button. It does not, and `AppSidebar`'s own "a Sheet drawer on mobile" comment was
  updated too.
- [x] 6.8 Add Send ↔ Receive swipe paging to the transfer screen: commit at 25% or velocity, no
  wrap at the outer edges, content tracking the finger, left edge strip left to the drawer. Tap
  and `⌘1`/`⌘2` keep working and produce identical state.
  Only the active panel is mounted (the tabs unmount the inactive one), so the drag translates
  that panel rather than sliding two side by side, and resistance drops to 0.12 at the ends so
  the limit is felt rather than merely refused.
- [x] 6.9 Add a directional transition to the tab content. Direction comes from watching the mode
  index actually change, not from the gesture, because the keyboard shortcut sets `app.mode`
  directly and never passes through the tabs' `onValueChange`.
- [x] 6.10 Add swipe-to-remove on paired device rows via a new `SwipeRow` component, marking the
  row `[data-swipe-row]`, and still opening the existing confirmation before trust is revoked.
  The revealed control is a real button, so removal stays a deliberate second tap.
- [x] 6.11 Remove the in-row destructive button — **on touch only**.
  **Correction to both specs:** removing it unconditionally would make removal unreachable with a
  mouse, since `horizontalSwipe` ignores non-touch pointers by design. The thumb hazard was a
  destructive control 8px from rename, which a mouse does not have. So the button is
  `pointer-coarse:hidden` and the swipe replaces it only where a finger is involved.
  `swipe-gestures` and `device-management` were both updated with fine-pointer scenarios.
- [x] 6.12 Add pull-to-refresh to the activity timeline: only at `scrollTop === 0`, triggering at
  64px, resisting past 96px, calling `loadActivity()` again. It lives on `PageShell`, which owns
  the scroller, via a new `pull-to-refresh` action.
  **Restructure this forced, and it was overdue:** the gesture needs something to call, so loading
  moved from `ActivityView` to the route and the view became a pure renderer taking `entries` —
  which is what `activity.ts`'s own comment already argued for.

## 7. Haptics (D7)

- [x] 7.1 Add `tauri-plugin-haptics` to `src-tauri/Cargo.toml` and register it in `lib.rs`. Both
  are gated to `cfg(any(target_os = "android", target_os = "ios"))`, matching how the existing
  mobile-only plugins are handled — the crate is mobile-only and has no desktop equivalent.
- [x] 7.2 Add `@tauri-apps/plugin-haptics` to `package.json` (2.3.2, matching the crate).
- [x] 7.3 Add the haptics permission to the app capabilities. It went in a **new**
  `capabilities/mobile.json` scoped to `["android", "iOS"]`, not into `default.json`: that file
  has no `platforms` key, so it applies everywhere, and a desktop build has no haptics plugin for
  the permission to resolve against.
- [x] 7.4 Add one `lib/haptics.ts` wrapper that no-ops unless `isTouch` and swallows every error.
  The plugin reports failure by *returning* a `Result` rather than rejecting, so both paths are
  swallowed. Its methods are named by moment (`copied`, `transferDone`, `accepted`) rather than by
  intensity, so call sites read as intent and the style mapping lives in one place.
- [x] 7.5 Fire the five moments: code copied (`light`, from both the send-code and pairing
  surfaces), file removed (`light`), transfer finished (`notificationFeedback('success')`, in the
  shared done handler so it covers both directions), offer answered (`medium` accept, `light`
  decline), pager commit (`selectionFeedback()`, only when the mode actually changes, so a
  spring-back at the end of the range fires nothing).
- [x] 7.6 Confirm haptics do **not** consult `prefers-reduced-motion`, and record why in the
  module: that setting is about visual and vestibular motion, and haptic strength has its own OS
  control that the platform honours below us.
- [x] 7.7 Verify the crate actually builds for a phone, not just that desktop still compiles
  around the target gate: `cargo check --target aarch64-apple-ios` compiles
  `tauri-plugin-haptics v2.3.2` clean.

## 8. Motion and styling cleanup (D8, D9)

- [x] 8.1 Replace `Tween` with `Spring` in `TransferProgress.svelte`, at
  `stiffness: 0.08, damping: 0.9`. Still needs tuning against a real transfer (task 9.9).
- [x] 8.2 Clamp the displayed percentage to 100. **Dropped the monotonic high-water mark:**
  holding it in `$state` and writing it from a `$derived` throws `state_unsafe_mutation` in
  Svelte 5, and a plain variable would stay pinned at 100 across a reset, leaving the bar stuck
  full. At this damping any post-overshoot dip is well under a percent, which the rounding
  already hides, so the clamp alone is correct and has no failure mode.
- [x] 8.3 Replace the centred spinner in `ActivityView.svelte` with three `Skeleton` rows shaped
  like timeline entries (node, two text lines, a badge), marked `aria-busy`. The empty state is
  untouched and stays visually distinct.
- [x] 8.4 Turn `TransferCard`'s six `max-sm:` chrome overrides into a `tv()` variant
  (`chrome: 'card' | 'bleed'`) selected by name. The two slot paddings (`Card.Header`,
  `Card.Content`) follow the same variant, so all eight properties move together.
- [x] 8.5 Extract `RevealVeil.svelte` from the hand-rolled veil on the Devices page. It owns the
  blur, the eye, the always-visible-on-touch behaviour, and the accessible name, so the page is
  left with a card inside a veil.
- [x] 8.6 Extract `InlineRename.svelte` and use it for both rename sites. It owns the
  Enter/Escape keys and the empty-name-is-a-cancel rule, which both call sites had implemented
  separately, so `saveSelf`/`saveRename` now just receive a trimmed name. The page's shared
  `editActions` snippet and four now-orphaned imports went with it.
- [x] 8.7 Drop hand-written keyframes for `tw-animate-css` equivalents.
  **Only one was actually replaceable, and it was dead code.** `tw-animate-css` ships just
  `enter`/`exit` plus accordion and caret keyframes: it has no shake at all, and its `zoom-in`
  has no overshoot, which is the entire character of `pop`. So `pop` and `shake` stay, with a
  comment recording why they cannot be swapped, and `slidein` was deleted outright — nothing
  referenced it.
- [x] 8.8 Update the `prefers-reduced-motion` block to match the surviving animation names.
- [x] 8.9 Copy pass, guideline not gate: the searching hint is now one thing to check rather than
  two ("Check that <code> matches what the sender is showing"); "just" and the inaccurate "the
  words" are gone from the send-code hint; the progress label drops "Encrypted · device to
  device ·" and leads with the filename; the three `'…'` badges became "setting up", "looking",
  and "starting".

## 9. Verification

None of this is reachable from `cargo test` or the browser preview, so it is checked by hand.

- [x] 9.1 `npm run check` and `npm run lint` clean. Check: 1204 files, 0 errors, 0 warnings.
  Lint needed a fix to be meaningful at all: it was already failing before this change on 316
  files under `.agents/skills/` plus a generated `skills-lock.json`. Those are agent tooling, the
  same category `.prettierignore` already excludes `.claude/` for and for the same stated reason,
  so they were added there. `npm run build` also clean.
- [x] 9.2 Desktop regression pass — **partial, and only the mechanical half.** Verified in the
  built CSS that every new touch rule is inside a media query and none applies to a fine pointer:
  `min-h-11`/`min-w-11` under `(pointer:coarse)`, the slop `::after` sizing under
  `(pointer:coarse)`, the code text under `not all and (pointer:coarse)`, and the sidebar row
  minimum under `not all and (width>=48rem)`. No rule landed unguarded. The one deliberate
  desktop-visible change is the gutter reconciliation.
  Not done: actually looking at it. There is no headless browser in this project, so a visual
  desktop comparison still has to happen by eye.
- [ ] 9.3 Measure hit areas with devtools touch emulation on each screen: header, transfer
  panels, devices, activity, settings, and both incoming prompts. Every control at 44px or more.
- [ ] 9.4 On a physical phone, verify the arbitration: an edge swipe over the transfer screen
  opens the drawer and does not page; a swipe past the strip pages; a vertical drag over the send
  queue scrolls and never turns into a page mid-gesture.
- [ ] 9.5 On a physical phone, verify the drawer drags closed and follows the finger, flicks
  closed above the velocity threshold, returns to open when abandoned, and that the overlay
  lightens with the drag.
- [ ] 9.6 Verify safe areas on a notched phone and in landscape: drawer top and bottom, the
  drawer footer above the gesture bar, and every page's bottom inset.
- [ ] 9.7 Verify Android hardware back still closes the drawer first, then dialogs, then the app —
  the selector change in 6.2 is what this is checking.
- [ ] 9.8 Verify all five haptics fire on Android and on iOS, and that a spring-back fires none.
- [ ] 9.9 Verify progress with a real multi-gigabyte transfer where the rate actually fluctuates,
  and tune the spring constants by eye. Confirm it never displays over 100.
- [ ] 9.10 Verify reduced-motion: looping decoration stops, entrances fade, progress still
  animates, gestures still track the finger, and haptics still fire.
- [x] 9.11 Confirm no request to `api.dicebear.com`. The `Avatar.Image` carrying that URL is gone,
  and no reference to the host remains anywhere in `src`, so there is no request left to observe.
- [x] 9.12 Re-read the Settings screen and confirm nothing on it states a value the app does not
  actually honour. What remains: the theme control (real), a notify switch and a relay field (both
  marked previews, neither asserting a value). The save-location field and the folder-per-transfer
  switch are gone, and the relay placeholder no longer imitates a hostname.

## 10. Still outstanding

Everything above is landed and green. What is left is the part no gate in this repo can reach:
`cargo test` does not see the frontend, the Vite preview cannot `invoke()`, and there is no
headless browser here, so tasks 9.3 through 9.10 need a real phone and a pair of eyes.

Highest-risk items among them, in order — these are where a defect is most likely to be hiding:

- [ ] 10.1 Gesture arbitration on a physical phone (9.4). Three horizontal gestures share the
  transfer screen and the devices list; the direction lock and the reserved edge strip are the
  whole safety argument and neither has been exercised.
- [ ] 10.2 The vaul drawer (9.5, 9.7). It is a patched vendored file, and the Android back handler
  depends on `data-mobile="true"` surviving the swap.
- [ ] 10.3 Spring constants for progress (9.9). `0.08 / 0.9` is an untested guess and needs a real
  fluctuating transfer to tune against.
- [ ] 10.4 Haptics on both platforms (9.8), including that the new `capabilities/mobile.json`
  actually grants the permission — a missing capability entry fails silently.
- [ ] 10.5 Safe areas on a notched phone (9.6), especially the drawer, which changed from an
  edge-to-edge sheet to an inset floating panel and had its safe-top padding deliberately removed.
