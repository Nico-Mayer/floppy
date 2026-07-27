<script lang="ts">
	import { Badge } from '$lib/components/ui/badge'
	import * as Card from '$lib/components/ui/card'
	import type { Snippet } from 'svelte'
	import type { Accent } from './types'

	let {
		accent,
		title,
		headline,
		badge,
		dropTarget = false,
		children
	}: {
		accent: Accent
		title: string
		headline: string
		badge: string
		/**
		 * Marks the card as the window's file-drop target. Wails hit-tests the
		 * drop point against `[data-file-drop-target]` and swallows the drop
		 * when nothing matches, so a card that omits this rejects files
		 * outright — the attribute is the whole opt-in, not a hint. While a
		 * drag hovers, the runtime toggles `file-drop-target-active` on us.
		 */
		dropTarget?: boolean
		children: Snippet
	} = $props()
</script>

<!-- The accent is published as two custom properties so everything inside the
     card can say bg-(--tint)/text-(--tint-fg) instead of branching on the
     accent prop itself. Deliberately not named --accent: that is a shadcn
     semantic token, and shadowing it would repaint any stock component that
     uses bg-accent. -->
<Card.Root
	class="h-full transition-colors duration-200 [&.file-drop-target-active]:bg-(--tint)/5 [&.file-drop-target-active]:ring-2 [&.file-drop-target-active]:ring-(--tint)"
	size="sm"
	style="--tint: var(--{accent}); --tint-fg: var(--{accent}-foreground)"
	data-file-drop-target={dropTarget ? '' : undefined}
>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<span class="size-3 rounded-full bg-(--tint)"></span>
			{title}
		</Card.Title>
		<Card.Description class="font-mono text-[10px] tracking-widest uppercase">
			{headline}
		</Card.Description>
		<Card.Action>
			<Badge variant="outline" class="font-mono tracking-widest text-muted-foreground uppercase">
				{badge}
			</Badge>
		</Card.Action>
	</Card.Header>
	<Card.Content class="flex min-h-0 flex-1 flex-col gap-3">
		{@render children()}
	</Card.Content>
</Card.Root>
