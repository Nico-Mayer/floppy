<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import { normal } from '$lib/motion'
	import CheckIcon from '@lucide/svelte/icons/check'
	import { fade } from 'svelte/transition'

	// The one completion screen (`feedback`): both transfer panels end here,
	// differing only in copy. The description is a plain-language line — who the
	// files went to, or came from. There is deliberately no path variant: where
	// received files landed is answered by the open-folder action and by Settings,
	// not by an absolute path on the screen that ends the flow.
	//
	// Entrance-only fade: the outgoing state is removed at once, so no two
	// states share the card and the layout cannot jump.
	let {
		title,
		description = ''
	}: {
		title: string
		description?: string
	} = $props()
</script>

<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon" class="animate-pop">
				<CheckIcon class="text-(--tint-fg)" />
			</Empty.Media>
			<Empty.Title>{title}</Empty.Title>
			{#if description}
				<Empty.Description>{description}</Empty.Description>
			{/if}
		</Empty.Header>
	</Empty.Root>
</div>
