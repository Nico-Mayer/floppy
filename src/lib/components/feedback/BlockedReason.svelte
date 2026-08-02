<script lang="ts">
	import InfoIcon from '@lucide/svelte/icons/info'
	import { cn } from '$lib/utils'

	// The one blocked-control explanation (`feedback`): a control disabled by app
	// state gets its reason said once, in one line, right beside it.
	let { label, class: className }: { label: string; class?: string } = $props()
</script>

<p class={cn('flex items-center gap-1.5 text-sm text-muted-foreground', className)}>
	<InfoIcon aria-hidden="true" class="size-3.5 shrink-0" />
	{label}
</p>
