<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import { normal } from '$lib/motion'
	import CheckIcon from '@lucide/svelte/icons/check'
	import { fade } from 'svelte/transition'
	import type { ReceiveTarget } from '../types'

	let { savedTo, target }: { savedTo: string; target: ReceiveTarget } = $props()
</script>

<!-- Entrance-only fade: the outgoing state is removed at once, so no two states
     share the card and the layout cannot jump. -->
<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon" class="animate-pop">
				<CheckIcon class="text-(--tint-fg)" />
			</Empty.Media>
			<Empty.Title>
				{target.kind === 'device' ? `Got them from ${target.name}` : 'All done'}
			</Empty.Title>
			<Empty.Description class="w-full truncate font-mono text-xs" title={savedTo}>
				{savedTo}
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
</div>
