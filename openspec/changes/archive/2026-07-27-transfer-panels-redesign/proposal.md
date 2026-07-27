# Proposal: transfer-panels-redesign

## Why

The transfer panels were laid out for one comfortable desktop size. At narrow widths (window min is 500px; future mobile targets are a stated goal) the content gets cramped, controls stay at desktop density (36–40px — below the 44px touch minimum from Apple's HIG), and there is no real compact-vs-regular differentiation. Vertical space is used poorly: the idle states center a large block mid-card while the primary action floats with it, instead of the content breathing and actions sitting where thumbs reach.

## What Changes

- **Container-query responsive layout** for both panels: `TransferCard`'s content becomes a size container; panels switch between a compact layout (stacked, smaller mascot, thumb-anchored actions) and a regular layout (mascot beside copy, denser controls) based on the card's own width — viewport-agnostic, ready for future side-by-side or mobile embeddings.
- **Touch-first control sizing**: `pointer-coarse:` bumps in the shared ui primitives (button, input, input-group) raise interactive controls to ≥44px and code-entry text to ≥16px on touch devices; desktop pointer density is unchanged.
- **Mascot stays** (branding) but stops costing the layout: smaller and stacked in compact, beside the copy in regular — the freed vertical space goes to the action zone.
- **Stable state scaffold**: every status (idle/connecting/transferring/done) renders into the same two-zone structure — flexible status zone above, anchored action zone below — so the action row stops jumping between states.
- Applies to `ReceivePanel`, `SendPanel`, and `TransferCard`. Clipboard auto-fill behavior (existing spec) is untouched; only its presentation moves with the input.

## Capabilities

### New Capabilities

- `transfer-panel-layout`: Responsive, touch-friendly layout system for the Send and Receive panels — container-driven compact/regular modes, minimum touch-target sizes, mascot placement, and stable cross-state structure.

### Modified Capabilities

- `receive-clipboard-detect`: The "from clipboard" provenance hint is replaced — auto-fill is now signaled by a brief animation on the input itself, and the input gains a general inline clear control (shown whenever non-empty). Detection, auto-fill, and suppression semantics are unchanged.

## Impact

- **Frontend only**: `frontend/src/lib/components/transfer/TransferCard.svelte`, `ReceivePanel.svelte`, `SendPanel.svelte`; shared primitives `ui/button/button.svelte`, `ui/input/input.svelte`, `ui/input-group/` (pointer-coarse size variants — owned source, kept minimal so future `shadcn-svelte update` diffs stay reviewable).
- **Tailwind v4.3** built-ins only: `@container` queries and the `pointer-coarse:` variant — no new dependencies.
- **No Go changes.** Window min size (500×800) unchanged; compact layout must be comfortable at exactly 500px.
- Existing `receive-clipboard-detect` spec scenarios must still hold after the restructure (hint below input, clear control, etc.).
