<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { IconAlertCircle, IconX } from '@tabler/icons-svelte'

	let {
		message,
		ondismiss
	}: {
		message: string
		ondismiss: () => void
	} = $props()
</script>

<div
	class="flex w-full animate-shake items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/5 p-3"
>
	<IconAlertCircle class="mt-0.5 size-4 shrink-0 text-destructive" />
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="text-sm font-bold tracking-tight">Something went wrong</span>
		<span class="truncate font-mono text-xs text-muted-foreground" title={message}>
			{message}
		</span>
	</div>
	<Button variant="ghost" size="icon-xs" onclick={ondismiss} aria-label="Dismiss">
		<IconX />
	</Button>
</div>
