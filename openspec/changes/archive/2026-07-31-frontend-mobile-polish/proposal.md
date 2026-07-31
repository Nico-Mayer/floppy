## Why

The frontend is structurally sound (shadcn-svelte throughout, container queries, safe-area
tokens, reduced-motion handling) but it is still a desktop app that has been made to fit a
phone rather than one that feels native on it. Three concrete problems:

1. **Touch targets are below the minimum, and one spec already says so.**
   `transfer-panel-layout` requires 44×44 CSS px hit areas on coarse pointers. The shipped
   code does not meet it: the transfer cancel button is 32px, the file-tile remove is 32px,
   the code clear and copy buttons are 24px. Outside the panels there is no rule at all, so
   the mobile app-bar menu is 32px, the paired-device remove is a 36px destructive button
   sitting 8px from rename, and accept/decline on an incoming transfer — the most
   consequential tap in the app — is 36px in a bottom drawer.

2. **There is one gesture, and it only opens.** `edge-swipe` snaps the nav drawer open at a
   40px threshold and never tracks the finger; there is no close gesture at all. The
   transfer screen is a two-tab surface with no swipe paging. `vaul-svelte` is already a
   dependency but is used only by dialogs.

3. **Three screens present placeholder data as real.** Settings shows a hardcoded
   `~/Downloads` (wrong on every mobile target) and a "give each transfer its own folder"
   switch for behaviour that is unconditional. Activity renders a fixed sample under the
   subtitle "A log of everything you've sent and received." The sidebar footer offers
   "Sign in to sync devices" for a feature that does not exist yet, and fetches an avatar from
   `api.dicebear.com` — an external network call in a product whose promise is peer-to-peer
   with no cloud.

Wiring those three screens is out of scope. They are keeping their rough layouts, so they
need to *say* they are previews instead of asserting things that are not true.

## What Changes

**Touch targets, by role.** One documented rule replacing per-call-site patches. Destructive,
primary, and navigation controls grow to 44px on coarse pointers; incidental and reversible
controls keep their visual size and gain an invisible hit-slop pseudo-element that expands
the tap box to 48px. A control may only use slop when no other interactive element sits
within 8px of it; adjacent controls both grow. Incoming-offer accept/decline become large,
stacked actions. Every hand-patched `min-h-11` / `size-8` / `h-11 md:h-9` override is deleted.

**One page shell.** `PageShell` + `PageHeader` replace three duplicated copies of
`h-full overflow-y-auto` + `mx-auto max-w-xl p-4 sm:p-6` + a raw `h1`/`p` heading block, and
reconcile the two gutter scales currently in use (the Transfer route uses `px-4 pt-2 pb-2`,
the other three use `p-4`). Inner scroll containers gain `overscroll-behavior: contain`,
which the global `none` on `html` does not reach.

**Named platform axes.** Three signals currently disagree about "mobile": UA sniffing
(`platform.ts`), width < 768 (`hooks/is-mobile`), and width ≥ 640 (`responsive-dialog`),
alongside Tailwind's `max-sm:` at 640. Each gets a name for what it actually measures, so
every branch picks one on purpose.

**Swipe gestures, with one arbitration rule.** A single `horizontalSwipe` action with a claim
predicate serves three consumers, evaluated on pointerdown in this order: a gesture starting
in the left 24px strip belongs to the drawer and nothing else inspects it; vertical intent
past 10px releases to scroll and is never re-claimed; a gesture inside a marked row is a row
swipe; anything else is the pager. Commit at 25% of width or on velocity, else spring back.
The three gestures: Send ↔ Receive paging on the transfer screen, swipe-to-remove on paired
device rows (which also retires that 36px destructive button), and pull-to-refresh on
Activity, guarded to fire only at `scrollTop === 0`.

**The nav drawer gains a close gesture.** The single mobile branch in the vendored
`ui/sidebar/sidebar.svelte` moves from `Sheet` to vaul `Drawer` with `direction="left"`,
which brings finger-tracked drag-to-close, velocity flick, and a progressive scrim.
Drag-to-*open* stays a snap: vaul's pointer handling exists only while the drawer is open, so
there is no public way to track an opening drag. Recorded as a known limit, not solved here.
Two knock-ons: the back-button handler matches on `data-mobile="true"`, which must survive
the swap, and `drawer-content` already carries `before:inset-2 before:rounded-4xl`, so the
drawer becomes a floating rounded panel rather than an edge-to-edge sheet.

**Preview markers.** A `stub: true` flag in `nav-items.ts` drives one `StubMark` primitive in
three placements: beside the page title, as a dot on the sidebar row (so it is known *before*
navigating), and in the sign-in dialog's title. Controls stay interactive, because reviewing a
rough layout means exercising its states. Settings drops the "save files to" field and the
folder-per-transfer switch outright rather than showing wrong values; the fake relay domain
placeholder goes. The sidebar avatar stops calling `api.dicebear.com`.

**Motion and haptics.** `tauri-plugin-haptics` is added and fired at five moments: code
copied, file removed from the queue, transfer finished, incoming offer answered, and pager
commit. Transfer progress moves from a linear 1s `Tween` to a `Spring` (a jittery byte rate
reads badly under linear interpolation). Tab content gains a directional transition; Activity
gains skeletons in place of a spinner, using the already-installed and currently unused
`skeleton` component.

**Custom styling collapsed.** `TransferCard`'s six `max-sm:` chrome-dissolve overrides become
a `tv()` variant (`chrome: card | bleed`). The hand-rolled reveal veil on the Devices page
(a `button` wrapping a Card plus two absolutely positioned spans) becomes `RevealVeil`. The
inline-rename pattern, built twice on that page, becomes `InlineRename`. Hand-written
`pop` / `shake` / `slidein` keyframes are dropped in favour of the already-imported
`tw-animate-css` equivalents.

**Copy pass.** Treated as a guideline, not a gate: the two-ask searching hint, filler in the
send-code hint, the engineer-voiced progress label, and the `'…'` status badges.

## Capabilities

### New Capabilities

- `touch-targets`: App-wide minimum hit areas on coarse pointers, expressed as a role rule
  (grow vs. hit-slop) plus the adjacency clause, superseding the panel-scoped rule.
- `swipe-gestures`: The gesture arbitration order and the three gestures it serves
  (mode paging, row swipe-to-remove, pull-to-refresh).
- `preview-markers`: How an unwired screen or control signals that it is a preview, and the
  single flag that drives every placement.
- `interface-motion`: The motion and haptics vocabulary — which moments get feedback, which
  animations carry information versus decoration, and how both collapse under
  `prefers-reduced-motion`.

### Modified Capabilities

- `app-shell`: Adds a requirement that every route renders through one page shell with a
  single gutter scale, one scroll container, and overscroll containment. Names the three
  platform axes so branches stop conflating form factor with width.
- `mobile-navigation`: The drawer becomes dismissable by a tracked drag with velocity, not
  only by overlay tap, destination choice, and hardware back. The left 24px strip is reserved
  for the drawer against all other horizontal gestures. Drag-to-open is explicitly a snap.
- `transfer-panel-layout`: Its panel-scoped 44px requirement is superseded by `touch-targets`.
  The mode switcher gains swipe paging alongside the existing tap and keyboard shortcuts.
  Card chrome dissolution becomes a declared variant rather than override classes.
- `device-management`: Removing a paired device moves from a row-adjacent destructive button
  to a row swipe; the confirmation drawer is unchanged.
- `app-shell-tauri`: `tauri-plugin-haptics` joins the plugin-backed platform services, with
  its capability permissions.

## Impact

**Frontend, all of it.** `src/routes/*` (four routes, three of which lose duplicated shell
code), `src/lib/components/ui/button` (role variants + slop), `ui/sidebar/sidebar.svelte`
(vendored patch — needs a marker comment, since `shadcn-svelte update sidebar` would clobber
it), `ui/tabs` (swipe paging), the transfer panels, the Devices page, `SettingsView`,
`ActivityView`, `AppSidebar`, `AppHeader`, `nav-items.ts`, `platform.ts`, `motion.ts`,
`actions/edge-swipe.svelte.ts` (generalised), `layout.css` (keyframes out, left-drawer
safe-area rule in).

**New components.** `PageShell`, `PageHeader`, `StubMark`, `InlineRename`, `RevealVeil`,
plus a `horizontalSwipe` action.

**Dependencies.** `tauri-plugin-haptics` in `src-tauri/Cargo.toml` and
`@tauri-apps/plugin-haptics` in `package.json`, with capability permissions. Possibly
`scroll-area` from the shadcn registry. `vaul-svelte` and `skeleton` are already installed
and become used more widely.

**Rust.** Only the haptics plugin registration in `lib.rs` and its capability file. No
command, event, or transport change, so `bindings.ts` does not regenerate and the IPC
contract is untouched.

**Not in scope.** Wiring Settings, Activity history, or authentication. Those screens keep
their rough layouts and gain preview markers instead. The one exception is deletion: fields
asserting values that are wrong (`~/Downloads`, folder-per-transfer) come out rather than
being marked, because a marker does not make a false statement true.

**Risk.** The vendored `sidebar.svelte` patch is the main maintenance cost. Gesture
arbitration is the main correctness risk: three horizontal gestures on one screen, verified
by hand on both a phone and an emulator, since none of this is reachable from `cargo test`
or the Vite browser preview.
