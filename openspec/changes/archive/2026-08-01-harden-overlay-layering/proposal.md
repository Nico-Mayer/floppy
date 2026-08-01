# harden-overlay-layering

## Why

On a phone, the "Add this device?" prompt sometimes appears *behind* the drawer
showing this device's QR code. It is not intermittent in the usual sense — it is
route-history dependent, and once you know the mechanism it reproduces every time.

**Every overlay in the app is `z-50`, so the tie is broken by DOM order in `<body>`
— and DOM order is mount order, not open order.**

`bits-ui` re-exports the raw portal utility as `Dialog.Portal`
(`node_modules/bits-ui/dist/bits/dialog/exports.js`). That utility calls
`mount(PortalConsumer, { target: document.body })` from an effect **when the
component mounts**, not when it opens; the `{#if open}` lives inside the node it
already appended. Svelte's `mount` appends to the end of the target. So:

```
cold start on /devices
  body: [ shell ] [ CodePanel portal ] [ Offer portal ] [ Pair portal ]
                    z-50                z-50            z-50  ← last, on top  ✅

/devices → /send → /devices     ({#key page.url.pathname} remounts the page)
  body: [ shell ] [ Offer portal ] [ Pair portal ] [ CodePanel portal ]
                    z-50            z-50            z-50  ← last, on top  ❌
```

The Devices page is inside the layout's `{#key page.url.pathname}` block, so every
navigation back to it re-appends `CodePanel`'s portal at the end of `<body>` and it
starts winning the tie against the two prompts that live in the layout.

The two drawers are open at once by design: `CodePanel` deliberately stays open when
its code is redeemed (it sets `used = true` rather than closing), which is exactly the
moment `IncomingPairDialog` opens.

Nothing in the app arbitrates between overlays. There are four z-index values in the
codebase — `50` for every dialog, drawer, sheet, select and tooltip; `60` for the
header; `70` for the scanner; and sonner's own `999999999` for toasts — and they were
each picked locally. Three more collisions fall out of the same gap:

| Colliding pair | Today |
| --- | --- |
| Code panel + incoming pair prompt | the reported bug |
| Any page dialog + incoming transfer offer | same coin flip |
| Scanner (`z-70`) + incoming transfer offer (`z-50`) | the offer is always invisible |
| Header (`z-60`) + any overlay (`z-50`) | on desktop the header stays bright over a dialog's dim |

Toasts are not affected: sonner's toaster is `z-index: 999999999`.

## What Changes

One lever, plus one thing taken away. Stacking becomes deterministic, and the prompt
stops carrying the one control that cannot behave on a phone.

- **A named layer scale, so paint order stops depending on portal order.** Four
  tokens in `layout.css` — header, panel, scanner, prompt — replace the four numbers
  picked locally today. A z-index beats DOM order outright, so once a surface names
  its layer, remounting a route cannot change what is on top.
- **Prompts move above the scanner, and the header moves below overlays.** A pairing
  or transfer prompt is the top app layer: it can arrive at any moment and must be
  seen, including over the camera. The header drops below the panel layer, which
  fixes the desktop case where it kept painting over a dialog's dim.
- **A surface names its layer with an attribute, not a class.** The two prompt
  components declare `data-layer="prompt"`; one unlayered rule in `layout.css` lifts
  both the content and its overlay. No vendored shadcn file is patched, so this
  survives a component update.
- **No overlay is closed to make room for another.** An earlier revision of this
  change had a system prompt close the panels underneath it. That was reverted: it
  put two vaul drawers into overlapping transitions, and vaul keeps its body-lock
  state in module-level singletons that do not survive that (design D4). Ordering is
  the whole mechanism now, which is also the smaller one.
- **The pair prompt loses its name field.** Found while running the change on two
  devices: on a phone the prompt arrives with the soft keyboard already up, over a
  bottom sheet, with vaul resizing the panel and `keepFocusVisible` scrolling under
  it. The prompt becomes what its own requirement already calls it — one question and
  two answers. The device is added under the name it suggested for itself, and every
  row in the list already renames inline, so nothing is lost and a prompt with no
  field cannot raise a keyboard on any platform. Two attempts at controlling focus
  instead were tried first and neither held (design D5).

Not in scope: moving portals into explicit container nodes. That is the deeper fix
for portal ordering, but it needs a `portalTo` prop threaded through
`ResponsiveDialog` into both `Dialog.Content` and `Drawer.Root`, and the layer scale
makes ordering irrelevant anyway.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: gains a named overlay layer scale — one token per layer, one owner per
  surface, and the rule that a surface's layer does not depend on when its portal
  mounted. Also gains the rule that a prompt arriving unasked carries no text field.
- `device-management`: `One-tap confirmation without naming` loses the inline rename
  it permitted: the confirmation carries no text field at all.

## Impact

- `src/routes/layout.css` — four `--z-*` tokens; one unlayered rule mapping
  `data-layer` to a token for dialog and drawer content plus their overlays.
- `src/lib/components/prompts/IncomingPairDialog.svelte`,
  `IncomingOfferDialog.svelte` — `data-layer="prompt"` on the content. The pair
  prompt also loses its `Input`, the `name` state, the effect seeding it, and the
  `nameOk` gate on Add; `confirm()` passes the suggested name straight through.
- `src/lib/components/shell/AppHeader.svelte` — `z-60` → the header token.
- `src/lib/components/devices/ScanSheet.svelte` — `z-70` → the scanner token.
- No Rust, no IPC, no broker change. No new dependency.
- No UI string is added. The description drops "or rename it below"; nothing else
  in the app's copy moves.
- `:has()` is used to reach an overlay from its content. Where it is unsupported the
  prompt's content still lands on the prompt layer and only its dim stays behind —
  the failure mode is cosmetic, not a return of this bug.
