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

## D4 — Nothing closes to make room, because two drawers cannot overlap

An earlier revision of this change had a system prompt close the panels underneath
it: `pairing.prompting` on the pairing state, and an effect on each owner clearing
`showingCode`, `removing` and `entering`. The argument was aesthetic — on a phone a
correct stack is still two dims and two sheets, with the lower one's edge showing.

It was reverted, because it is not safe. vaul-svelte keeps its body-lock state in
**module-level singletons**, shared by every drawer on the page:

```js
// use-position-fixed.svelte.js:5
let previousBodyPosition = null;

// use-prevent-scroll.svelte.js:43
let preventScrollCount = 0;
let restore;
```

`previousBodyPosition` is captured by the first drawer to open and cleared by any
drawer that closes. The close path calls `restorePositionSetting()` unconditionally:

```js
// use-position-fixed.svelte.js:109
else {
    restorePositionSetting();
}
```

The "is another drawer still open?" guard exists — but only in a *different* watch's
cleanup (`use-position-fixed.svelte.js:83`), not here. So closing one drawer while
another is opening strips `position: fixed` off `<body>` and runs `window.scrollTo`,
in the same frame the second drawer is animating in.

Two drawers being open at once is what the app already did, and it works: the second
one to open never re-captures, so nothing is stomped. Two drawers *transitioning* at
once is what the arbitration added, and it is the unsupported case. The distinction
is worth stating plainly, because the two look identical in the component tree.

So ordering is the whole mechanism. The layer scale is deterministic, it needs no
state, no effects and no cross-component predicate, and it was already enough for the
bug this change exists to fix. What it does not do is make the stack pretty, and that
is the right thing to give up.

Reverted with it: `CodePanel`'s spent-because-used state comes back. With the panel
staying open behind the prompt, "That code has been used." is the honest thing for it
to say, and it is the panel's own business again rather than a consequence of a rule
somewhere else.


## D5 — The prompt has no text field, so it cannot raise a keyboard

Found on two devices after D1-D5 were in: the phone shows a code, the desktop
redeems it, and the prompt opens on the phone with the soft keyboard already up over
the sheet.

The mechanism is worth recording, because two plausible fixes both failed against it.

vaul already declines to autofocus:

```js
// vaul-svelte drawer.svelte:35
autoFocus = false,

// vaul-svelte use-drawer-content.svelte.js:73
function onOpenAutoFocus(e) {
    opts.onOpenAutoFocus.current?.(e);
    if (!ctx.autoFocus.current) e.preventDefault();
}
```

But bits-ui does not fall back to the container on a prevented event. It skips
focusing altogether:

```js
// bits-ui focus-scope.svelte.js:56
this.#opts.onOpenAutoFocus.current(event);
if (!event.defaultPrevented) {
    ...  firstTabbable.focus()  ...  else this.#container.focus()
}
```

So the drawer opens, traps focus, and focus is *outside the trap*. The trap corrects
that the only way it knows:

```js
// bits-ui focus-scope.svelte.js:120
(firstTabbable || firstFocusable || container).focus()
```

`firstTabbable` was the name field. Any focus event landing outside the drawer hands
the field the focus that open-autofocus refused to give it, and on a phone there is
no shortage of those: the platform restoring focus to a field it remembers, a tap
landing in the sheet as it slides up, another overlay closing behind it.

Two systems then fight over the sheet, both keyed on "a text input is focused": vaul
rewrites the drawer's height in pixels (`use-drawer-root.svelte.js:243-290`), and
`keepFocusVisible` pads and scrolls the region under it (`keyboard.ts:85-90`).
Neither is wrong; they are both right at once.

Two attempts were made at controlling focus, and both were the wrong shape of answer:

1. **Let vaul decline autofocus.** Already the default, and this is what leaves focus
   outside a live trap in the first place.
2. **Prevent autofocus and place focus on the panel** (`e.preventDefault()` then
   focusing the content element, which carries `tabindex: -1` from the focus scope).
   This closes the specific path above and did not stop the keyboard on device. Focus
   is not the only thing that opens a keyboard on a phone — a tap that lands in the
   sheet as it slides up will do it, and so will the platform restoring focus to a
   field it remembers.

The field itself is the problem, and it did not need to be there. The requirement
governing this prompt is called *One-tap confirmation without naming*: the redeemer
is not asked to name anything, and the shower "SHALL NOT require the user to enter a
name; it MAY offer an inline rename". The field took that MAY and made the prompt a
form, gated Add behind a non-empty value, and asked for a decision the user had not
made yet.

It is also redundant. The device arrives with the name it calls itself, which is what
the user is being shown and asked about, and every row in the list renames inline
(`DeviceRow` -> `InlineRename` -> `pairing.rename`). Renaming a device you just added
is one tap away, on the surface where you can actually see it next to the others.

So the prompt becomes one question and two answers, and `confirm()` passes
`request.suggestedName` straight to `confirmPair`. No text input, no focus rule, no
platform branch, and nothing left for vaul and `keepFocusVisible` to disagree about.

`IncomingOfferDialog` never had a field. `EnterCodeDialog` keeps its, and keeps its
autofocus: the user opened it in order to type.

One thing the field was never doing, found while checking that nothing regressed:
it was not a durable rename. `confirmPair` reaches `TrustStore::add(key,
advertised_name)`, which writes the **advertised-name** slot, not `local_override`
(`pairing/trust.rs:19-24, 125-132`). A name typed in the prompt would therefore be
replaced the next time the peer advertised its own. The local override is only ever
set by a rename on the device list, which is now the only place offering one — so
removing the field also removes a rename that did not stick.

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
lowest cost of all. Rejected twice over: the ordering would still be a coin flip for
every other pair of overlays, and closing a drawer to open another is the unsafe
manoeuvre in D4.
