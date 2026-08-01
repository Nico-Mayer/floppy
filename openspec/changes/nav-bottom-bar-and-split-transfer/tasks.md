Ordering is by dependency, not by size. Two constraints drive it:

- **Group 5 must not run before group 4.** Reverting `sidebar.svelte` while
  `+layout.svelte` still mounts `AppSidebar` below 768 leaves the registry's Sheet
  drawer, which has no close gesture at all — worse than today.
- **Groups 1-3 must land together.** Splitting the routes without the bar leaves a
  phone with no navigation, and the bar without the split leaves two stacked
  bottom bars.

Every group ends verifiable in the running app.

## 1. Destinations and routes

- [x] 1.1 `nav-items.ts`: replace the Transfer entry with Send (`/send`, `SendIcon`) and Receive (`/receive`, `DownloadIcon`), keep Devices and Settings, drop the Activity entry. Remove `ArrowLeftRightIcon` and `Clock3Icon`. Keep `stub` on every entry and keep `as const`.
- [x] 1.2 `nav-items.ts`: delete `titleFor`. Its only caller is the mobile app-bar branch removed in 4.3, and the desktop header renders no title. Keep `isStub`.
- [x] 1.3 Create `routes/send/+page.svelte`: `PageShell width="wide" pad="tight" gap="none"` wrapping `SendPanel` plus the per-side error alert. No `Tabs`, no pager, no switcher.
- [x] 1.4 Create `routes/receive/+page.svelte`: same shape wrapping `ReceivePanel`.
- [x] 1.5 Create `routes/+page.ts` with `redirect(307, resolve('/send'))`. `ssr = false` is already set in `+layout.ts`, so this resolves client-side under the SPA fallback. Delete the old `routes/+page.svelte`.
- [x] 1.6 Verify: `/send`, `/receive`, `/devices`, `/settings` all render, and `/` lands on `/send`.

## 2. Retire `app.mode`

- [x] 2.1 `transfer-app.svelte.ts`: delete the `mode` field. Keep the exported `Mode` type — it is the transfer kind carried by every event payload and consumed by `describeError`.
- [x] 2.2 `transfer-app.svelte.ts` deep-link handler: replace `this.mode = 'receive'` with a `goto` to `/receive`, keeping the code prefill and the no-auto-start rule. This is the latent bug fix — the handler previously navigated nowhere.
- [x] 2.3 `pairing-app.svelte.ts` accepted-offer path: replace `app.mode = 'receive'` plus `goto('/')` with `goto('/receive')`.
- [x] 2.4 `pairing-app.svelte.ts` `pairingAccepted`: change `goto('/')` to `goto('/send')`, making explicit what previously relied on the mode already being `send`.
- [x] 2.5 `pairing-app.svelte.ts` `pairingRequest` and `pairingPaired`: confirm both still target `/devices` and need no change. (A fourth site, `sendTo`, also set `app.mode = 'send'` with no navigation; the write is simply dropped, since the destination it implied is where `pairingAccepted` now routes.)
- [x] 2.6 Verify on device: a `floppy://receive?code=…` deep link opened while on `/devices` navigates to `/receive` with the code filled and nothing started. (Verified on iOS with a hand-authored URL. Separately noted, and not this change's business: nothing in the app *produces* such a link, and a custom scheme is not tappable in messengers — both want Universal/App Links and a share affordance, in their own proposal.)

## 3. Per-side errors

- [x] 3.1 `transfer-app.svelte.ts`: move `error` from the app object onto each side, so `send` and `receive` each own one. `describeError(message, kind)` already receives the kind and the reset is already per-kind, so follow that grain.
- [x] 3.2 `routes/send/+page.svelte` and `routes/receive/+page.svelte`: render each side's own error alert, with its own dismiss. (The alert itself is one shared `TransferError` component — the two routes want the identical treatment, not a similar one.)
- [x] 3.3 Verify: a send failure shows on `/send` only, a receive failure on `/receive` only, and dismissing one leaves the other.

## 4. Bottom bar and shell

- [x] 4.1 Create the bottom-bar component: one item per `nav-items.ts` entry, icon plus label, active state by exact pathname match, 44px minimum hit area, `pb-(--safe-bottom)`. Not `fixed` — it takes no z-index.
- [x] 4.2 Bar indicators: the Devices count, the preview marker for `stub` destinations, and a per-side dot for a running or failed transfer. All three must coexist on one item without truncation.
- [x] 4.3 `AppHeader.svelte`: delete the entire `isPhoneChrome` branch, and with it the menu button and its `hidden={sidebar.openMobile}`. The desktop branch keeps its menu control, which still toggles the rail. (It is gated on `!sidebar.isMobile`, so a narrow desktop window — where the bar is the navigation — renders no menu control either.)
- [x] 4.4 `+layout.svelte`: mount `<AppSidebar>` only at or above the `IsMobile` threshold and the bar only below it, as a third flex child of the provider. Keep `Sidebar.Provider` mounted at every width — it owns `Sidebar.Inset` and the header calls `useSidebar()`.
- [x] 4.5 `+layout.svelte`: move `pb-(--safe-bottom)` off `Sidebar.Inset` onto the bar, and add `pt-(--safe-top)` to the content region for the mobile case where no header exists.
- [x] 4.6 `+layout.svelte`: retarget the Toaster `mobileOffset` from `--header-height` to `calc(var(--safe-top) + var(--spacing) * 2)`. Leave the desktop `offset` on `--header-height`. (`html[data-mobile] { --bar-height: … }` went with it: both remaining `--header-height` consumers are desktop-only.)
- [x] 4.7 `+layout.svelte`: drop `[data-slot="sidebar"][data-mobile="true"]` from the back-handler's overlay selector. Dialogs, sheets, and drawers still match; with no overlay open, back still closes the window.
- [x] 4.8 `+layout.svelte`: replace `ModeSwitcher`'s `⌘1`/`⌘2` handler with a global `⌘1`–`⌘4` over `nav-items.ts`, so it works from every route and cannot drift from the destination list.
- [x] 4.10 `+layout.svelte`: animate the route change in the direction of travel, with the direction derived from position in `nav-items.ts` rather than from the control that caused it, so a bar tap, a sidebar click, a shortcut and a programmatic `goto` all agree. Only the arriving screen animates; `fast()`/`shift()` already collapse to 0 under reduced motion. (Added during apply: the `interface-motion` spec requires it and the behaviour it replaces lived in the deleted pager.)
- [x] 4.9 Verify at both widths: below 768 the bar renders and no sidebar or drawer exists; at or above it the sidebar renders and no bar does. Resizing a desktop window across the threshold swaps them cleanly.

## 5. Remove the drawer and its gesture

Do not start before group 4 is complete and verified.

- [x] 5.1 Delete `src/lib/components/shell/NavEdgeSwipe.svelte` and `src/lib/actions/edge-swipe.svelte.ts`, and remove the `NavEdgeSwipe` usage from `+layout.svelte`.
- [x] 5.2 `horizontal-swipe.svelte.ts`: delete `EDGE_STRIP` and `notEdgeStrip`. Remove the `claim: notEdgeStrip` from `SwipeRow.svelte` so a row swipe works across its full width.
- [x] 5.3 `horizontal-swipe.svelte.ts`: update the module comment. The arbitration order loses its edge-strip step and its pager step, and `SwipeRow` is now the only consumer.
- [x] 5.4 Revert `src/lib/components/ui/sidebar/sidebar.svelte` to the shadcn-svelte registry version, dropping the vaul patch and its six-item comment. The mobile branch is unreachable after 4.4, so the registry Sheet inside it never renders. (Only the vaul branch and the comment were reverted: the desktop branch in the working tree is from a *newer* registry than the pre-patch commit, so restoring that commit wholesale would have downgraded it.)
- [x] 5.5 `layout.css`: simplify the safe-area block that excluded the nav drawer via `:not([data-mobile])`, since that drawer no longer exists.
- [x] 5.6 Verify on desktop at several widths that the sidebar, its rail collapse, and its safe-area spacing are unchanged by the revert.

## 6. Sign-in moves to Settings

- [x] 6.1 `SettingsView.svelte`: add an Account `Field.FieldSet` containing `LoginView` and a `StubMark`, following the existing fieldset rhythm.
- [x] 6.2 `AppSidebar.svelte`: make the account row a link to `/settings`. Delete `signInOpen`, the `Dialog.Root` block, and the `LoginView` import.
- [x] 6.3 `AppSidebar.svelte`: ensure the account row does not take `isActive`, so it and the Settings destination row do not both read as active on `/settings`.
- [x] 6.4 Verify: the account row navigates, only the destination row highlights, and sign-in renders inside Settings.

## 7. Delete Activity, keep pull-to-refresh

- [x] 7.1 Delete `src/routes/activity/` and `src/lib/components/activity/`.
- [x] 7.2 `devices/+page.svelte`: pass `onrefresh={() => pairing.refresh()}` to its existing `<PageShell scroll>`, giving the gesture its first non-preview consumer.
- [x] 7.3 Confirm `PageShell`'s `onrefresh` prop, `pull-to-refresh.svelte.ts`, and the `Spinner` import all still have a live consumer and are not left dead.
- [x] 7.4 Verify on device: pulling down at the top of the device list reloads it, pulling mid-list scrolls, and a short pull springs back — plus that the spinner is visibly spinning on release, that repeated pulls all fire, and that a half-typed code and an open rename are cleared while a displayed pairing code is not. (Three defects found in the first pass and fixed: the gesture used passive pointer listeners, so iOS's overscroll bounce started first and cancelled the touch — it is now touch events with a non-passive `touchmove` that claims a downward drag from a resting top before the axis is even decided; the busy state now has a 450ms floor, since a trust-store read finishes inside a frame; and `refresh()` on the Devices page resets the screen's transient state along with its data. All three are now in the `swipe-gestures` spec.)

## 8. Transfer card headline

- [x] 8.1 `TransferCard.svelte`: remove `max-sm:hidden` from `Card.Description` and update the comment — the mode switcher and app bar that justified hiding it are both gone.
- [x] 8.2 Verify the headline is legible on a phone in every send and receive state without pushing the action zone off screen.

## 9. Documentation

- [x] 9.1 `hooks/is-mobile.svelte.ts`: update the doc comment — the threshold now decides bottom bar versus icon rail, not drawer versus rail.
- [x] 9.2 `platform.ts`: update the signals note — platform form factor now governs whether a titlebar exists at all, rather than the mobile app bar versus the desktop titlebar.
- [x] 9.3 Drop the deferred `branding-placement-split` idea. It proposed making the sidebar brand row mobile-only; the sidebar is now desktop-only, which inverts it.

## 10. Gates and on-device verification

- [x] 10.1 `npm run check` and the project lint/format pass with no new findings.
- [x] 10.2 `cargo test` in `src-tauri/` and `go test -race ./...` in `broker/` still pass. Neither should be affected — no command, event, or binding changed — so a failure here means something crossed the IPC boundary that should not have.
- [x] 10.3 Confirm `src/lib/ipc/bindings.ts` is unchanged, proving the frontend-only scope.
- [x] 10.4 Android on device or emulator: bar clears the gesture bar, content clears the status bar with no top app bar, hardware back closes the app with no overlay open and dismisses a dialog when one is open, and no edge swipe opens anything.
- [x] 10.5 iOS on simulator: same checks, plus that the missing top app bar leaves the safe-top strip looking intentional rather than empty.
- [x] 10.6 Both platforms: four labelled tabs read comfortably at the small-phone width, and every bar item meets the 44px minimum. (iOS confirmed at phone width; the Android pass covers the same items under 10.4.)
- [x] 10.7 Both platforms: start a transfer, navigate away, confirm the bar indicates it, then return and confirm the screen shows the live state.
- [x] 10.8 Both platforms: focus the receive code field and the pair-code field. The focused field stays in view, and the bar stands down rather than riding above the keys — returning on blur. (Added during apply. Two causes, both fixed: `--safe-bottom` folded the Android IME inset in, so the bar's padding grew by a whole keyboard; and iOS shrinks the web view under the keyboard, which displaces an in-flow bar upward no matter what the inset says. MainActivity now reports system bars only, `app.html` declares `interactive-widget=overlays-content`, and `BottomNav` drops out of the tree while a text field is focused — see the keyboard exception in the `mobile-navigation` spec.)
