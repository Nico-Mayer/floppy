<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import { normal } from '$lib/motion'
	import { IconCheck } from '@tabler/icons-svelte'
	import { fade } from 'svelte/transition'
	import type { SendTarget } from '../types'

	let { summary, target }: { summary: string; target: SendTarget } = $props()
</script>

<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon" class="animate-pop">
				<IconCheck class="text-(--tint-fg)" />
			</Empty.Media>
			<Empty.Title>Sent {summary}</Empty.Title>
			{#if target.kind === 'device'}
				<Empty.Description>to {target.name}</Empty.Description>
			{/if}
		</Empty.Header>
	</Empty.Root>
</div>
