## Context

The frontend is ~9k LOC of SvelteKit + Svelte 5 runes, built almost entirely from
shadcn-svelte primitives, with container queries on the transfer panels, safe-area tokens per
edge, and `prefers-reduced-motion` already honoured in both CSS and the JS transition
durations. The archived `unify-responsive-shell` change produced one shell for every platform
and width. This change is not a rebuild; it is the mobile-feel layer that shell never got.

Three constraints shape every decision below:

- **Nothing here is reachable from an automated gate.** `cargo test` covers Rust; the Vite
  browser preview at :1420 cannot `invoke()` or `listen()`. Touch targets, gestures, and
  haptics are verified by hand on a phone and an emulator. Designs that need fine tuning by
  eye must say so and name the knob.
- **`src/lib/components/ui/` is vendored.** Files there came from the shadcn-svelte registry
  and can be re-fetched. Any patch to one is a maintenance liability that has to be marked.
- **One requirement already exists and is being violated.** `transfer-panel-layout` requires
  44×44 CSS px hit areas on coarse pointers inside the transfer panels. The shipped code does
  not meet it. The fix therefore has to be structural, or it will drift again.

## Goals / Non-Goals

**Goals:**

- A hit-area rule that holds by construction, so no call site has to remember it.
- One page container, so a route cannot invent its own gutter scale.
- Gesture behaviour that is predictable when three horizontal gestures share a screen, with
  the arbitration order written down rather than emergent from listener registration order.
- A close gesture on the nav drawer, which today has none.
- Unwired screens that say they are previews instead of asserting false values.
- Haptic and motion feedback at the moments that matter, without becoming a light show.

**Non-Goals:**

- Wiring Settings, Activity history, or authentication. Rough layouts are the target.
- Finger-tracked drawer *opening*. See D5 — vaul cannot do it and hacking it is not worth the
  coupling.
- Unifying every breakpoint. Three thresholds exist for three reasons; they get named, not
  merged (D2).
- Changing any Rust command, event, or the IPC contract. Only the haptics plugin registration.
- Retiring the Mascot, the accent tokens, or the card's `--tint` mechanism. All three are good
  and stay.

## Decisions

### D1. Hit area is inferred from the size a call site already chose

The role rule from the proposal (destructive/primary/navigation grow; incidental slop) needs a
mechanical trigger, or it becomes a per-call-site decision and rots. The trigger is the `size`
variant, because choosing `icon-xs` for a clear button versus `default` for a submit button is
*already* the role judgement.

Added to `buttonVariants` as a `touch` variant with compound defaults:

| Existing size | Implied `touch` | Coarse-pointer result |
|---|---|---|
| `default`, `lg`, `icon`, `icon-lg` | `grow` | `min-h-11 min-w-11` (44px) |
| `xs`, `sm`, `icon-xs`, `icon-sm` | `slop` | visual size unchanged, hit box 48px |
| any size + `variant="destructive"` | `grow` (compound, escalates) | 44px |

Slop is an invisible `::after` present only under `pointer-coarse`. It is **not** a negative
inset: a fixed `-inset-[6px]` expands by a constant, which leaves a 24px `icon-xs` control at
36px and misses the minimum entirely. Instead the pseudo-element is centred on the button and
sized `h-full w-full min-h-12 min-w-12`, so the hit region is at least 48px in each axis and
never smaller than the button itself. That makes the guarantee independent of which size the
call site picked, which is the whole point of inferring the treatment from the size.

Nothing reflows, so desktop rendering is byte-identical and the "fine pointer keeps desktop
density" scenario holds for free.

Checked against every current call site, the inference lands correctly without exceptions:
`AppHeader` menu (`icon` → grow, and its `size-8` override is deleted), `FileCard` remove
(`destructive` → grow), transfer cancel (`destructive` → grow), offer accept/decline
(`default` → grow), code clear and copy (`icon-xs` → slop), alert dismiss (`icon-xs` → slop),
"New code" (`sm` → slop), device rename (`icon` → grow). An explicit `touch` prop stays
available as the escape hatch; no current call site needs it.

Two constraints that must be written down because they are invisible until they break:

- **Slop needs clearance from any `overflow-hidden` ancestor**, which clips pointer events on
  the overflowing part. The distance is derived from the control's size — half of
  `48 - size`, so 12px for `icon-xs` and 6px for `icon`. `InputGroup`, `Item`, and `Alert`
  have no clipping ancestor. `Card` does (`card.svelte:18`), but every slopped control inside
  one sits within the 16px card padding, which clears even the 12px case. A future slopped
  control flush to a card edge must use `touch="grow"` instead.
- **Adjacency.** Slop can overlap a neighbour's visual box. It only lands on `xs`/`sm` sizes,
  which are solitary in every current layout — the one adjacent pair on the Devices page is
  two `icon`-size buttons, which grow rather than slop. So this is a review check rather than a
  code rule, and `touch="grow"` is the fix when it is violated.

`Sidebar.MenuButton` is not built on `buttonVariants`, so it carries its own coarse-pointer
minimum inside the component. That replaces the `h-11 md:h-9` class currently repeated at the
`AppSidebar` call site.

*Alternatives rejected:* a global `pointer-coarse` size bump (reflows the devices rows, the
code input addons, and the card header badge row, and loses the density the design wants on
desktop); slop everywhere (a 24px visual target for a destructive action is legible-but-wrong,
and users aim at what they can see); an explicit prop at every call site (the exact
remembering-to-do-it that produced today's violation).

### D2. Three platform axes get three names, and stay three

Four thresholds currently answer "is this mobile", and they disagree:

```
platform.ts isMobile      UA: android|iphone|ipad|ipod    form factor
hooks/is-mobile           width < 768                     sidebar drawer-vs-rail
responsive-dialog         width >= 640                    drawer-vs-dialog
Tailwind max-sm:          width < 640                     bleed-vs-card
```

They are renamed for what they measure, not merged:

- `isTouch` — `(pointer: coarse)`. Drives hit areas, always-visible reveal controls (there is
  no hover to discover them with), and whether haptics fire.
- `isNarrow` — width < 640, aligned to Tailwind's `sm`. Drives bleed layout and
  drawer-vs-dialog. `responsive-dialog`'s `isDesktop()` becomes `!isNarrow`, which is the same
  threshold it already used, now sharing one definition.
- `isPhoneChrome` — the UA test, today's `isMobile`. Drives the app bar versus the desktop
  titlebar, the `data-mobile` attribute on `<html>`, and hiding actions the platform cannot
  honour (revealing a folder in a file manager).

The sidebar's 768 stays where it is and keeps its own name. It decides when a *rail* is worth
the horizontal room, which is a different question from when *content* should go full-bleed.
Merging it would move the rail breakpoint, a visual regression with no benefit.

This makes today's mixed signals explicit rather than fixing them silently: a 500px desktop
window gets `isNarrow` (bleed, drawer) but not `isPhoneChrome` (titlebar, no `data-mobile`),
and that is now a legible statement instead of an accident.

### D3. One page container, with the differences declared as props

The four routes duplicate their shell three times and disagree on gutters. The Transfer
route's tighter vertical padding (`pt-2 pb-2` against the others' `p-4`) is not a mistake — it
buys height for a card that fills the viewport on a phone. So `PageShell` parameterises the
real differences rather than flattening them:

```
PageShell props        Transfer            Devices / Activity / Settings
  scroll               false               true    (owns overflow-y-auto)
  width                wide                prose
  pad                  tight               default

  wide    = max-w-3xl md:max-w-4xl lg:max-w-5xl
  prose   = max-w-xl
  tight   = px-4 py-2 sm:p-6
  default = p-4 sm:p-6
```

`PageHeader` takes `title`, `description`, and `stub`, replacing the `h1`/`p` block copied
three times. The Transfer route has no header (its card carries its own title), so the header
is a separate component rather than baked into the shell.

Every `scroll` container gets `overscroll-behavior: contain`. The global `none` on `html`
(`layout.css:242`) does not reach inner scrollers, so today a scroll that hits the end of the
Activity list can rubber-band the whole webview on iOS.

*Alternative rejected:* forcing all four routes onto one padding scale. It would either cost
the Transfer card ~16px of height on a phone or add 8px of dead gutter to the other three.
Declaring two scales is honest; discovering them scattered across four files is not.

### D4. One swipe action, arbitration by claim predicate

Three horizontal gestures now share the app. Correctness cannot depend on which listener
registered first, so a single `horizontalSwipe` action serves all three and each consumer
declares what it will *not* take:

```
horizontalSwipe(node, {
  claim:      (e: PointerEvent) => boolean   // false -> ignore this pointer entirely
  onProgress: (dx: number) => void
  onCommit:   (dir: -1 | 1) => void
  onCancel:   () => void
  threshold?: number   // fraction of node width, default 0.25
  velocity?:  number   // px/ms, default 0.5
  enabled?:   boolean
})
```

Resolution order, evaluated on `pointerdown` then on the first 10px of travel:

```
1. e.pointerType !== 'touch'            -> ignore. no mouse dragging.
2. startX < 24                          -> the drawer's. no other consumer inspects it.
3. |dy| > |dx| after 10px of travel     -> release to scroll, permanently for this pointer.
4. closest('[data-swipe-row]')          -> row swipe.
5. otherwise                            -> pager.
commit at threshold of width OR velocity; else spring back.
```

Rules 1–3 already exist in `edge-swipe.svelte.ts:26-45`; this generalises that logic instead
of writing a second gesture engine beside it. The 24px edge test lives in one exported
`notEdgeStrip(e)` helper that every non-drawer consumer calls from its `claim`, so the reserved
strip cannot drift between consumers.

Rule 3 is the one that makes the pager safe over the `SendQueue` grid, which scrolls
vertically inside the card. "Permanently for this pointer" matters: re-claiming after a
direction lock is what makes a gesture feel like it is fighting you.

Per-consumer parameters:

- **Pager** (Send ↔ Receive): commit at 25% of width or velocity. No wrap — two tabs, and the
  outer edges spring back. Tap and `⌘1`/`⌘2` keep working unchanged.
- **Row swipe** (paired devices): commit at 40% to reveal Remove; the existing confirmation
  drawer still opens, since removing trust is destructive and a swipe is easy to do by
  accident. Rename stays a button in the row — only remove moves to the gesture.
- **Pull-to-refresh** (Activity): vertical, so it does not enter the arbitration above. Fires
  only at `scrollTop === 0`, triggers at 64px of pull, rubber-bands to a 96px maximum.

### D5. vaul left drawer: tracked close, snap open, and one marked patch

The nav drawer's mobile branch is `sidebar.svelte:36-58` — a single `Sheet.Root`/`Sheet.Content`
pair. It becomes `Drawer.Root direction="left"`. `drawer-content.svelte:25` already ships
`data-[vaul-drawer-direction=left]` styling (`inset-y-0 left-0 w-3/4 sm:max-w-sm`), so the
swap is smaller than the vendored-file diff suggests.

**What this buys:** finger-tracked drag-to-close, velocity flick, and a scrim that fades with
the drag. Today the drawer can only be closed by tapping the scrim, choosing a destination, or
Android hardware back — no gesture at all.

**What it does not buy: drag-to-open.** vaul's pointer handling lives in
`use-drawer-content.svelte.js` and `use-drawer-handle.svelte.js`, both of which exist only
while the drawer is open. There is no public way to hand it an in-flight opening drag. So
`edge-swipe` remains the opener and stays a snap at its 40px threshold. This is a deliberate
known limit, recorded rather than worked around: driving vaul's internal drag state from
outside would couple us to its internals and break on any upgrade.

Five knock-ons, all verified against the current code:

1. `Drawer.Content` must carry both `data-slot="sidebar"` and `data-mobile="true"`. The
   Android back handler (`+layout.svelte:78-80`) matches
   `[data-slot="sidebar"][data-mobile="true"]` among its overlay selectors.
2. `layout.css:266-270` pads sheet safe areas via `[data-slot='sheet-content'][data-side='left']`,
   which no longer matches. A `[data-vaul-drawer-direction='left']` rule replaces it. The need
   is reduced but not gone: `AppSidebar`'s footer `pb-(--safe-bottom)` still applies.
3. `shouldScaleBackground` defaults to `true` in the vendored `drawer.svelte`. For a nav drawer,
   scaling the whole app behind it is the wrong effect. Set `false`.
4. `AppSidebar` overrides `Sidebar.Root` with `top-(--header-height)!` and
   `h-[calc(100svh-var(--header-height))]!` to sit below the app bar. Left-direction
   `Drawer.Content` is `fixed inset-y-0`, so those overrides must be confirmed to still land
   after the swap.
5. vaul warns without a title. The sheet's `sr-only` header becomes an `sr-only` `Drawer.Title`.

**Accepted visual change:** `drawer-content` also carries `before:inset-2 before:rounded-4xl`,
so the nav drawer becomes a floating rounded panel rather than an edge-to-edge sheet. This
matches the app's `rounded-4xl` language and needs *less* safe-area work than edge-to-edge, so
it is accepted rather than overridden.

The patched file gets a comment naming it as intentionally divergent from the registry, since
`shadcn-svelte update sidebar` would overwrite it.

*Alternative rejected:* a hand-written drag-dismiss action on the Sheet, leaving the vendored
file untouched. It costs ~80 LOC to own, requires reproducing vaul's velocity and scrim
behaviour by hand, and leaves two gesture engines in the app (vaul for dialogs, ours for nav).
One marked patch is the cheaper liability.

### D6. One stub flag, three placements

`nav-items.ts` is already the single source of destinations. It gains `stub?: true` on
`/activity` and `/settings`, which drives:

- `PageHeader` renders `StubMark` beside the title when `stub` is set.
- `AppSidebar` renders a dot on that destination's row, so the state is known *before*
  navigating rather than discovered after.
- The sign-in dialog, which is not a route, passes `stub` to its title directly.

`StubMark` is an icon-only badge with a tooltip. Controls inside a stub screen **stay
interactive**: the point of a rough layout is exercising its states, and a disabled switch
cannot be reviewed.

A marker is not a licence to keep lying, so two Settings controls are deleted rather than
marked: the "save files to" field (it asserts `~/Downloads`, wrong on every mobile target,
where the real destination is resolved per platform in `lib.rs:502-511`) and the
"give each transfer its own folder" switch (the datetime folder is unconditional in
`manager.rs:77`, so the switch offers a choice that does not exist). The fake relay domain
placeholder goes too. What remains on the page is the theme control, which is real, plus the
notify switch and the relay field as marked previews.

The sidebar avatar stops fetching `api.dicebear.com`. That is an external network call in a
product whose promise is peer-to-peer with no cloud, and the icon fallback already renders
correctly without it.

The sign-in row itself **stays**. Account-backed device sync is a planned feature, so the entry
point is a preview of something real rather than dead scaffolding, and deleting it would only
have to be rebuilt.

An earlier reading of this treated the row as contradicting `rendezvous-broker/spec.md:48`
("no accounts, no persistence"). That was an overstatement: that requirement scopes the
**broker**, which routes by device fingerprint and authenticates by device-key signature. An
app-level account for syncing a trust store between installs is a different service and does not
change the broker's contract. `preview-markers` records this explicitly, so the marked row
cannot later be read as licence to put accounts in the broker.

What the row must not do is describe itself in terms that imply otherwise. Its copy stays
limited to syncing devices between installs.

### D7. Haptics: five moments, no reduced-motion coupling

`tauri-plugin-haptics` is added (Rust + npm + a capability permission entry). Five call sites,
mapped to the API's three feedback families:

| Moment | Call |
|---|---|
| Code copied | `impactFeedback('light')` |
| File removed from the queue | `impactFeedback('light')` |
| Transfer finished | `notificationFeedback('success')` |
| Incoming offer answered | `impactFeedback('medium')` accept, `'light'` decline |
| Pager commits to the other tab | `selectionFeedback()` |

All five go through one wrapper that no-ops unless `isTouch`, and swallows errors — a missing
plugin or a device with no vibrator must never surface as a failure in a transfer path.

**Haptics deliberately do not consult `prefers-reduced-motion`.** That setting is about visual
and vestibular motion; haptic intensity has its own OS-level control that the platform already
honours below us. Suppressing touch feedback because someone dislikes parallax would be a
misreading.

### D8. Motion changes that carry information, not decoration

- **Progress becomes a `Spring`.** `TransferProgress.svelte:20` uses `Tween` with a linear
  1000ms duration; a byte rate that jitters looks mechanical under linear interpolation.
  Starting point `stiffness: 0.08, damping: 0.9`, tuned by eye against a real transfer. A
  spring can overshoot, so the displayed integer is clamped — a bar that reads 101% is worse
  than a stiff one.
- **Tab content gets a directional transition.** Direction comes from the index delta between
  the outgoing and incoming mode, so a swipe and a `⌘1` press both move the right way.
- **Activity gets skeletons.** `skeleton` is installed and unused; three placeholder rows
  replace the centred spinner at `ActivityView.svelte:61`.

Everything already there stays: the ping dot, `BorderBeam` on the waiting QR, `animate:flip`
on the queue, the entrance-only fades that keep two states from ever sharing the card.

### D9. Bespoke styling collapsed into declared variants

- `TransferCard.svelte:52` carries six `max-sm:` overrides to dissolve the card into the page.
  That is a variant wearing a class string: it becomes `tv({ chrome: 'card' | 'bleed' })`.
- The Devices reveal veil (`devices/+page.svelte:217-255`, a `button` wrapping a `Card` plus
  two absolutely positioned spans with hand-tuned opacities) becomes `RevealVeil`.
- The inline-rename pattern, built twice on that page (`:163` self, `:328` device), becomes
  `InlineRename`.
- `pop`, `shake`, and `slidein` keyframes (`layout.css:173-209`) are hand-written while
  `tw-animate-css` is already imported with equivalents. `bob` is bespoke to the Mascot and
  stays. The reduced-motion block that neutralises them is updated to match whatever names
  survive.

## Risks / Trade-offs

- **Vendored `sidebar.svelte` patch is overwritten by `shadcn-svelte update sidebar`** →
  Marker comment in the file naming it as intentionally divergent, and the knock-on list in
  D5 is the recovery checklist if it is ever clobbered.
- **Three horizontal gestures on one screen is the main correctness risk, and no automated
  gate covers it** → One action with one written arbitration order (D4), plus the shared
  `notEdgeStrip` helper so consumers cannot disagree about the reserved strip. Verified by
  hand on a physical phone and an emulator; direction lock and the edge strip get explicit
  checks.
- **Hit slop is clipped by an `overflow-hidden` ancestor within 6px, silently** → Constraint
  written into the spec, current call sites audited clear, `touch="grow"` documented as the
  fix.
- **Spring progress can display over 100%** → Clamp the displayed integer.
- **Pull-to-refresh on Activity re-renders a fixed sample, so the gesture is decorative until
  history is wired** → Accepted knowingly; the screen carries a preview marker that says
  exactly this.
- **Deleting two Settings controls leaves the page thin** → Correct outcome. A short honest
  page beats a full false one, and the space returns when the controls become real.
- **The drawer becoming a floating panel is a visible change nobody asked for** → It falls out
  of the vaul swap, matches the app's existing radius language, and reduces safe-area work.
  Called out here so it is a decision rather than a surprise.
- **Haptics on Android need the vibrate permission** → Handled by the plugin, but the
  capability file needs the entry, which is easy to miss and fails silently.

## Migration Plan

Five slices, each independently reviewable and green. `1` before `2` and `4`; `3` and `6`
float.

```
1  SHELL          platform axes named (D2); PageShell + PageHeader (D3);
                  overscroll containment. Pure refactor, no visual delta
                  except the reconciled gutters.
2  TOUCH          buttonVariants touch variant (D1); delete every
                  hand-patched override; offer dialogs to large stacked
                  actions; Sidebar.MenuButton carries its own minimum.
3  PREVIEW        stub flag + StubMark in three placements (D6);
                  delete the two false Settings controls and the
                  dicebear fetch.
4  GESTURES       horizontalSwipe + notEdgeStrip (D4); vaul left drawer
                  and its five knock-ons (D5); pager, row swipe,
                  pull-to-refresh.
5  MOTION         haptics plugin and its five call sites (D7); spring
                  progress; tab transition; Activity skeletons (D8).
6  POLISH         tv() chrome variant; RevealVeil; InlineRename;
                  keyframes dropped for tw-animate-css (D9); copy pass.
```

Rollback is per slice. Slice 4 is the only one with a vendored patch, so it is also the only
one whose revert is not purely additive.

## Open Questions

- ~~**Does account sync belong in this product?**~~ **Resolved:** yes, as a planned feature. The
  row stays as a marked preview, and `preview-markers` records that this says nothing about the
  broker, which stays accountless and stateless. What signing in actually syncs, and where it
  stores it, is left to the change that builds it.
- **Should rename become a swipe action too, for symmetry?** Current plan: no. Remove swipes,
  rename stays a button. One gesture per row is easier to discover than two, and rename is the
  reversible one.
- **Spring constants for progress.** `0.08 / 0.9` is a starting point, not a measured value.
  Needs one pass against a real multi-gigabyte transfer where the rate actually fluctuates.
- **Does the pager belong to the whole Transfer route or only the card?** Proposed: the route,
  so a swipe anywhere below the mode switcher pages. If that turns out to fight the queue grid
  in practice despite the direction lock, scoping it to the card is the fallback.
