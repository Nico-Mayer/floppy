<script lang="ts">
	import Mascot from '$lib/components/transfer/Mascot.svelte'
	import * as Empty from '$lib/components/ui/empty'
	import { cn } from '$lib/utils'
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'

	// The one empty-state hero (`feedback`): the mascot with the panel's copy
	// beside it. Compact card widths stack it; regular ones (@md, card width) put
	// the mascot beside the text so the branding stays without spending the
	// card's height on it. The copy area is a snippet because the Send hero
	// crossfades two shapes in it.
	let {
		accent,
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & {
		accent: 'send' | 'receive'
		children: Snippet
	} = $props()
</script>

<Empty.Root class={cn('p-6 @md:p-8', className)} {...rest}>
	<Empty.Header class="@md:max-w-none @md:gap-6">
		<Empty.Media class="@md:mb-0">
			<Mascot {accent} class="size-20 @md:size-24" />
		</Empty.Media>
		{@render children()}
	</Empty.Header>
</Empty.Root>
