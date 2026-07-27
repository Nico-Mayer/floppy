# Design: transfer-panels-redesign

## Context

Both panels render inside `TransferCard` (Card shell with accent tint, `App.svelte` caps the column width). Current layout facts:

- Idle states use `Empty.*` with a `size-20` mascot centered mid-card; input/CTA stack floats beneath it. On short/narrow windows this cramps; on tall ones it strands the primary action mid-air.
- Controls are desktop-density: Button `default` = `h-9` (36px), `lg` = `h-10` (40px), icon buttons down to `size-6`. Apple HIG touch minimum is 44×44pt.
- The only responsive handling is viewport `sm:` in SendPanel's waiting state (QR leads on narrow — good instinct, wrong mechanism: it reacts to the window, not the card).
- Tailwind v4.3: container queries (`@container`, `@sm:`…) and `pointer-coarse:` are built in.
- Window min 500×800; mobile targets are a stated project goal (in-process croc keeps them possible).
- Existing spec `receive-clipboard-detect` pins receive-input behavior (auto-fill, hint below input, clear control) — presentation may move, behavior may not.

## Goals / Non-Goals

**Goals:**

- Compact vs regular layouts driven by the card's own width, comfortable down to 500px (and plausible at ~360px for future mobile).
- Touch targets ≥44px and code text ≥16px on coarse pointers, without inflating desktop density.
- Keep the mascot prominent (branding) while reclaiming the vertical space it currently costs.
- Same two-zone skeleton across all states so actions stop jumping.

**Non-Goals:**

- Any behavior change: transfer flows, events, clipboard auto-fill semantics, keyboard shortcuts all stay.
- Visual retheming (colors, typography scale, card chrome) beyond what layout requires.
- Go/window changes; no new dependencies.

## Decisions

### 1. Container queries, not viewport breakpoints

`TransferCard`'s content area becomes a size container (`@container`); panels use `@sm:`/`@md:` variants for compact→regular switches. SendPanel's existing viewport `sm:` responsive bits (QR row) migrate to container variants.

- *Why*: the card is the layout unit. Viewport breakpoints lie the moment panels are composed differently (side-by-side desktop layout, mobile shell, wider tab area). Container queries make each panel self-sufficient.
- *Alternative rejected*: keeping viewport `sm:` everywhere — cheaper today, but every future composition change re-breaks the panels.

### 2. Touch sizing lives in the ui primitives via `pointer-coarse:`

Add coarse-pointer bumps once, in the size variants of `ui/button` and `ui/input`(+`input-group`): e.g. `default` gains `pointer-coarse:h-11` (44px), `sm`/icon sizes bump proportionally (no interactive control below `pointer-coarse:min-h-11 / min-w-11` hit area), inputs gain `pointer-coarse:h-11 pointer-coarse:text-base` (16px also kills iOS focus-zoom).

- *Why in the primitives*: one source of truth; panels stay free of sizing overrides (per shadcn rules, `class` is for layout). Edits to owned component source are expected in shadcn-svelte; kept as small appended utilities so registry `update` diffs stay readable.
- *Alternative rejected*: per-usage `class` bumps — scattered, guaranteed to drift; a `size="touch"` variant — callers would have to branch, `pointer-coarse:` does it declaratively.

### 3. Two-zone scaffold inside TransferCard

`TransferCard` grows an optional `actions` snippet: content renders in a flexible, scrollable status zone; `actions` renders in a fixed bottom zone with consistent padding. Panels move their per-state buttons (Cancel, Receive files, Send…, Open folder/reset) into it.

- *Why*: today each state re-invents the column and the buttons land at different heights — the reflow the user feels. Anchoring actions bottom also matches thumb reach on touch (HIG: primary actions in the reachable zone).
- Entrance-only fades stay exactly as they are (they already prevent two states coexisting); the scaffold removes the *vertical drift* those fades can't hide.

### 4. Mascot: hero row in regular, compact chip in compact

Idle states keep the mascot but stop stacking a `size-20` block above everything:

- **Compact** (narrow card): mascot `size-12`–`size-14`, stacked with title/description tightened; input + CTA get the recovered space.
- **Regular** (`@md:`): mascot sits beside the copy (horizontal hero row, left-aligned text) — the card reads like a proper empty state instead of a vertical totem; input/CTA occupy the action zone below.
- Send's drag-target Empty keeps its whole-surface click/drop affordance in both modes.

### 5. Receive input block becomes the visual primary

The code input + Receive button form one group in the action zone: input `text-center font-mono` stays, gains `@sm:` width cap so it doesn't stretch absurdly wide in regular mode; button full-width in compact, content-width centered in regular. Placeholder/`saves to` line stay with the group.

- Clipboard auto-fill logic is not touched — same state, same conditions; only the surrounding structure changes. The `receive-clipboard-detect` scenarios (as amended below) are the regression checklist for this move.

### 6. Fill animation + inline clear instead of the provenance hint row

*(Iteration after UX review — the text hint read as tiny and ignorable.)* The input becomes an `InputGroup` (shadcn): `InputGroup.Input` for the code, an `inline-end` `InputGroup.Addon` with an ✕ `InputGroup.Button` rendered whenever the input is non-empty — a general clear affordance, not a clipboard-specific one. Auto-fill provenance is signaled by replaying the app's existing `animate-pop` keyframe on the group at fill time (class toggled for ~400ms so later fills replay it; app.css already collapses keyframes to a fade under `prefers-reduced-motion`).

- Clearing an auto-filled value still records it as dismissed for the session — without that, the next window focus would instantly re-fill what the user just deleted.
- Captured as a `MODIFIED` delta on the `receive-clipboard-detect` main spec (provenance requirement rewritten).

## Risks / Trade-offs

- [`pointer-coarse:` unverifiable in the desktop app (no touch) ] → verify via browser devtools touch emulation at :9245 (pure CSS, safe to check there) + visual pass in the native window for the fine-pointer path.
- [Editing shadcn-owned primitives makes future `shadcn-svelte update` conflicts] → additions are single utilities appended to size variants; documented here so a future update can re-apply them deliberately.
- [Container query support] → Tailwind v4 targets modern engines; WKWebView/WebView2 shipped `@container` well before the Wails 3 baseline — no fallback needed.
- [Restructure silently breaks a clipboard-detect scenario (hint position, clear control)] → run that spec's scenarios as part of verification; they are the contract.
- [Two-zone scaffold could fight states with tall middle content (send file list)] → status zone is `min-h-0 flex-1` and stays `overflow: visible`; scrollable content (the file list) brings its own `overflow-y-auto`. Zone-level `overflow-y-auto` was tried and reverted: CSS pairs the overflow axes, so it forces `overflow-x: auto` and paints a dead horizontal scrollbar.
- [44px coarse-pointer minimum reads small on compact cards even with a mouse] → primary/action buttons additionally carry `@max-md:min-h-11`, so the compact layout gets the larger targets regardless of pointer type.
