<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import { normal } from '$lib/motion'
	import CheckIcon from '@lucide/svelte/icons/check'
	import { fade } from 'svelte/transition'

	// The one completion screen (`feedback`): both transfer panels end here,
	// differing only in copy. `mono` is for a filesystem path, which truncates
	// and keeps the full text in the tooltip.
	//
	// Entrance-only fade: the outgoing state is removed at once, so no two
	// states share the card and the layout cannot jump.
	let {
		title,
		description = '',
		mono = false
	}: {
		title: string
		description?: string
		mono?: boolean
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
				{#if mono}
					<Empty.Description class="w-full truncate font-mono text-xs" title={description}>
						{description}
					</Empty.Description>
				{:else}
					<Empty.Description>{description}</Empty.Description>
				{/if}
			{/if}
		</Empty.Header>
	</Empty.Root>
</div>
