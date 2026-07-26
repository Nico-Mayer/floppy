<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { IconX } from '@tabler/icons-svelte'
	import { basename, ext } from './files'

	let {
		path,
		onremove
	}: {
		path: string
		onremove: () => void
	} = $props()
</script>

<li class="flex animate-slidein items-center gap-3 rounded-lg border bg-card p-2.5">
	<div
		class="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted font-mono text-[10px] font-bold"
	>
		{ext(path)}
	</div>
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="truncate text-sm font-medium">{basename(path)}</span>
		<span class="truncate font-mono text-xs text-muted-foreground">{path}</span>
	</div>
	<Button
		variant="ghost"
		size="icon-sm"
		class="text-muted-foreground hover:bg-destructive hover:text-white"
		onclick={onremove}
		aria-label="Remove file"
	>
		<IconX />
	</Button>
</li>
