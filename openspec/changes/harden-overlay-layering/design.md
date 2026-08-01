# Design

## D1 — Why portal order is mount order, and why that is not fixable locally

`bits-ui` does not give `Dialog` a portal of its own. `Dialog.Portal` is the shared
portal utility, re-exported verbatim:

```js
// node_modules/bits-ui/dist/bits/dialog/exports.js
export { default as Portal } from "../utilities/portal/portal.svelte";
```

That utility resolves a target and mounts a consumer into it from a `watch` effect:

```js
// node_modules/bits-ui/dist/bits/utilities/portal/portal.svelte
watch([() => target, () => disabled], ([target, disabled]) => {
    if (!target || disabled) { unmountInstance(); return }
    instance = mount(PortalConsumer, { target, props: { children }, context })
    return () => { unmountInstance() }
})
```

Three consequences, all load-bearing here:

1. The effect depends on `target` and `disabled` — **not** on the dialog's open
   state. The node is appended when the component mounts.
2. Svelte's `mount` appends to the end of the target, and the target is
   `document.body`. So the node's position among its siblings is decided by *when the
   component mounted*.
3. `PortalConsumer` renders `{@render children}` with no wrapper element, so an
   overlay and its content land as **direct children of `<body>`**, adjacent to each
   other, with no grouping node. That rules out grouping selectors, and it is why D3
   reaches the overlay by adjacency.

`drawer-content.svelte` and `dialog-content.svelte` both render
`<Portal><Overlay /><Content /></Portal>` unconditionally, so both mount their portal
node at component-mount time. `IncomingPairDialog` and `IncomingOfferDialog` mount
once with the layout and never move. `CodePanel` mounts with the Devices page, which
sits inside `{#key page.url.pathname}` in `+layout.svelte` and therefore remounts on
every navigation.

So on a cold start at `/devices` the page's portal is appended first and the prompts
win the `z-50` tie; after any navigation back to `/devices` the page's portal is
appended last and the prompts lose. Nothing about the pairing code path is involved —
this is decided entirely by route history before the request ever arrives.

Fixing it at the call site is not possible: the ordering is inside a dependency's
effect. The two real options are to stop tying, or to stop portaling to a shared
target. This change takes the first.

## D2 — The layer scale

Four tokens, defined once next to the safe-area tokens in `layout.css`:

```
--z-header:  40   /* sticky app header, above page content */
--z-panel:   50   /* dialogs, drawers, sheets, selects, tooltips — the shadcn default */
--z-scanner: 60   /* the camera's own chrome */
--z-prompt:  70   /* incoming pairing request, incoming transfer offer */
                  /* toasts: sonner's own 999999999, above everything */
```

Two of the four numbers change from what is in the code today.

**The header drops from 60 to 40.** `AppHeader` is `sticky z-60` inside
`Sidebar.Provider`, and nothing between it and `<body>` creates a stacking context
(`[data-slot='sidebar-wrapper']` declares a `transition` but stays at `opacity: 1`,
which does not create one). So today it genuinely competes with body-level portals at
`z-50` and wins: on desktop the header stays bright while a dialog dims everything
else. `BottomNav.svelte`'s header comment records the argument; this ends it. The
header only has to beat page content, and 40 does.

**Prompts go above the scanner rather than the scanner closing for them.** A pairing
request cannot arrive on the scanning device — that device is the redeemer — but a
transfer offer can, and today it renders at `z-50` under `ScanSheet`'s `z-70` and is
simply invisible. Killing a live scan for an unrelated file offer is worse than
letting the prompt sit over the camera, so ordering resolves it. `html[data-scanning]`
only makes the document background transparent and fades
`[data-slot='sidebar-wrapper']`; a prompt is portaled to `<body>`, outside that
wrapper, so it is unaffected and its own dim covers the camera as it would cover
anything else.

`--z-panel` keeps the value shadcn already ships so that no vendored component has to
be edited: an unnamed surface stays where it is.

## D3 — Reaching an overlay from its content, without patching vendored files

A surface names its layer with `data-layer`, which reaches the DOM through the props
already spread onto the content element. The overlay is a separate element with no
prop path from the call site — `drawer-content.svelte` and `dialog-content.svelte`
both hard-code `<Overlay />` with no class hook. But both render it as the
**immediately preceding sibling** of the content:

```svelte
<DrawerPortal {...portalProps}>          <DialogPortal {...portalProps}>
    <DrawerOverlay />                        <Dialog.Overlay />
    <DrawerPrimitive.Content ...>            <DialogPrimitive.Content ...>
```

so `:has(+ …)` reaches it:

```css
[data-slot='dialog-content'][data-layer='prompt'],
[data-slot='drawer-content'][data-layer='prompt'],
[data-slot='dialog-overlay']:has(+ [data-layer='prompt']),
[data-slot='drawer-overlay']:has(+ [data-layer='prompt']) {
    z-index: var(--z-prompt);
}
```

Unlayered, for the same reason the safe-area rules in that file are unlayered: the
content's own `z-50` is a utility, and utilities beat `@layer base`.

Choosing an attribute over a class is deliberate. A class handed through
`ResponsiveDialog.Content` would go through `cn`/tailwind-merge and would have to win
against the vendored `z-50` by prefix — the trap that produced four sidebar defects
already. An attribute selector is not a Tailwind utility and does not enter that
argument.

`:has()` is the one browser feature this leans on. Every target webview has it
(WKWebView 15.4+, Android WebView 105+, WebView2, WebKitGTK 2.38+). If it were
missing, the two content selectors still match and the prompt still paints above the
panel; only the prompt's own dim would stay at `--z-panel`. The bug does not come
back.

## D4 — Why arbitration is worth having on top of the layer scale

The layer scale makes the prompt land in front. It does not make the result good: on
a phone both surfaces are bottom drawers with `max-h-[80vh]`, so a correct stack is
still two dims and two sheets, with the panel's rounded top edge poking out behind
the prompt.

The rule is one line of policy — *a system prompt does not share the screen with a
user-opened panel*. What it is not is one line of code in one place: the app's three
user-opened overlays do not share an owner. The Devices page owns `showingCode` and
`removing`; `DeviceList` owns `entering`, because the control that opens the
enter-a-code dialog is the one beside the list.

So the rule is named once and applied twice. `pairing.prompting` — *request or
incoming* — is the single place the predicate and its reasoning live, and each owner
closes what it owns in one line against it. Hoisting `entering` to the page to get a
single effect would move a panel away from the control that opens it to save a line,
and a third prompt event later would still only have to be added in one place either
way.

Naming the predicate on `pairing` rather than deriving it at each site is what keeps
this from being the rule stated twice. A call site says *a prompt is up, so close* —
it does not say which events count as a prompt.

Placing the effects on the owners rather than inside each overlay component keeps
`CodePanel` and `EnterCodeDialog` free of knowledge about a prompt neither owns.

## D5 — What closing the code panel does to its spent state

`CodePanel`'s `used` flag has exactly one writer:

```js
$effect(() => { if (code && pairing.request) used = true })
```

Under D4 that same condition now closes the panel, so `used` can never be observed
and the branch is dead. It goes, along with `spent`'s `used ||` term and the
`{used ? 'That code has been used.' : 'That code has run out.'}` ternary. `spent`
becomes the run-out case only, which is the case that still needs a spent state: the
code dies with the panel open and nobody there to explain it.

Closing also resets the panel — the `!open` branch clears `code`, `used`, `elapsed`
and `tried` — so reopening after declining a request mints a fresh code rather than
re-showing a burned one. That is the right outcome and it costs nothing extra.

The existing `seenPaired` effect, which closes the panel when a pairing completes, is
kept. It is now redundant for the shower (already closed by D4) but still fires when
*this* device is the redeemer and happens to have the panel open.

## D6 — Alternatives considered

**Stable portal containers.** Render `<div id="layer-panels">` and
`<div id="layer-prompts">` in the layout and portal into them, so DOM order is fixed
by markup. This is the true root-cause fix and it is what a from-scratch design would
do. It needs a `portalTo` prop threaded through `ResponsiveDialog` into
`Dialog.Content`'s `portalProps` and `Drawer.Root`'s `container`, and every call site
has to pick a container or silently get the default. Rejected for this change: more
surface, and once layers are named the ordering it fixes no longer decides anything.

**Bumping only the two prompts to `z-[60]`.** The smallest possible patch, and it
fixes the reported bug. Rejected because it leaves the overlay behind at `z-50`
(the panel would paint over the prompt's dim), leaves the scanner-versus-offer hole
open, leaves the header-over-dim bug open, and adds a fifth locally-picked number to
the four this change exists to replace.

**Closing the code panel only, with no layer work.** Fixes the reported bug for the
lowest cost of all. Rejected because the ordering is still a coin flip for every
other pair of overlays, and the next collision would be diagnosed from scratch.
