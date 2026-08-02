<script lang="ts" module>
	import { tv } from 'tailwind-variants'

	// The card has two chrome treatments, and they are named here rather than
	// assembled from override classes at the call site: `card` is the desktop box,
	// `bleed` dissolves it into the page so the transfer surface *is* the screen.
	// Naming them is what stops one of the six properties involved from drifting
	// out of step with the other five.
	//
	// `bleed` is applied below `sm` and `card` above, so a single element carries
	// both — which is why every bleed rule is written as a `max-sm:` variant rather
	// than as two separate class sets.
	const transferCardVariants = tv({
		base: 'h-full transition-colors duration-200 [&.file-drop-target-active]:bg-(--tint)/5 [&.file-drop-target-active]:ring-2 [&.file-drop-target-active]:ring-(--tint)',
		variants: {
			chrome: {
				card: '',
				bleed: 'max-sm:rounded-none max-sm:bg-transparent max-sm:py-2 max-sm:shadow-none max-sm:ring-0'
			}
		},
		defaultVariants: { chrome: 'bleed' }
	})

	/** Slot padding follows the chrome: bleed drops the card's own horizontal inset. */
	const slotPadding = { card: '', bleed: 'max-sm:px-0' } as const
</script>

<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import { cn } from '$lib/utils'
	import type { Snippet } from 'svelte'
	import type { Accent } from './types'

	// Headerless by design: the screen's title, tint dot and live status line
	// live in the shared top bar (PageHeader), so the card is the surface under
	// it, not a second heading. The accent still comes in because the content
	// inside paints with the tint tokens.

	let {
		accent,
		dropTarget = false,
		chrome = 'bleed',
		children,
		actions
	}: {
		accent: Accent
		/**
		 * Marks the card as a file-drop target. Tauri reports drops for the whole
		 * window, so +page.svelte hit-tests the drop point against
		 * `[data-file-drop-target]` and refuses anything that misses — the
		 * attribute is the whole opt-in, not a hint. While a drag hovers this
		 * card, that handler toggles `file-drop-target-active` on us.
		 */
		dropTarget?: boolean
		/**
		 * Which chrome treatment to wear. `bleed` (the default) dissolves the card
		 * into the page below `sm`; `card` keeps the box at every width.
		 */
		chrome?: 'card' | 'bleed'
		children: Snippet
		/**
		 * Controls for the anchored zone at the bottom of the card. Every
		 * state renders its primary/destructive actions here so they sit at
		 * one consistent position (and in thumb reach) instead of drifting
		 * with the status content above.
		 */
		actions?: Snippet
	} = $props()
</script>

<!-- The accent is published as two custom properties so everything inside the
     card can say bg-(--tint)/text-(--tint-fg) instead of branching on the
     accent prop itself. Deliberately not named --accent: that is a shadcn
     semantic token, and shadowing it would repaint any stock component that
     uses bg-accent. -->
<!-- Chrome is chosen by name (see the variants above): `bleed` dissolves the card
     into the page on a phone so the transfer surface is the screen rather than a
     floating box, with PageShell supplying the one gutter. Desktop keeps the full
     card either way. -->
<Card.Root
	class={transferCardVariants({ chrome })}
	size="sm"
	style="--tint: var(--{accent}); --tint-fg: var(--{accent}-foreground)"
	data-file-drop-target={dropTarget ? '' : undefined}
>
	<!-- @container makes the card content the layout unit: panels switch
	     compact/regular on the card's own width (@sm:/@md: variants), so they
	     stay correct however the window — or a future shell — composes them. -->
	<Card.Content class={cn('@container flex min-h-0 flex-1 flex-col gap-3', slotPadding[chrome])}>
		<!-- No overflow on the zone itself: overflow-y-auto would force
		     overflow-x to auto (CSS pairs the axes) and paint a dead
		     horizontal scrollbar. Content that can grow (the send file
		     list) brings its own overflow-y-auto instead. -->
		<div class="flex min-h-0 flex-1 flex-col gap-3">
			{@render children()}
		</div>
		{#if actions}
			<!-- Panels pass one actions snippet that branches on status, so it is
			     always truthy but renders nothing in some states (no files yet,
			     cancelling). :has(*) collapses the zone in exactly those states —
			     display:none also takes it out of the flex flow, so the parent's
			     gap stops painting a phantom margin under the content. -->
			<div class="flex shrink-0 flex-col gap-2 [&:not(:has(*))]:hidden">
				{@render actions()}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
