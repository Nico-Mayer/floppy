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
		children
	}: {
		accent: Accent
		title: string
		headline: string
		badge: string
		children: Snippet
	} = $props()
</script>

<!-- The accent is published as two custom properties so everything inside the
     card can say bg-(--tint)/text-(--tint-fg) instead of branching on the
     accent prop itself. Deliberately not named --accent: that is a shadcn
     semantic token, and shadowing it would repaint any stock component that
     uses bg-accent. -->
<Card.Root class="h-full" size="sm" style="--tint: var(--{accent}); --tint-fg: var(--{accent}-foreground)">
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
