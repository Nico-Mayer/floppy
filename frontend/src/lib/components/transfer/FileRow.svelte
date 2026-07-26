<script lang="ts">
	import type { FileEntry } from '$bindings/floppy/models'
	import { Button } from '$lib/components/ui/button'
	import { IconFolder, IconX } from '@tabler/icons-svelte'
	import { ext } from './files'
	import { formatBytes } from './format'

	let {
		file,
		onremove
	}: {
		file: FileEntry
		onremove: () => void
	} = $props()
</script>

<li class="flex animate-slidein items-center gap-3 rounded-lg border bg-card p-2.5">
	<div
		class="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted font-mono text-[10px] font-bold"
	>
		{#if file.isDir}
			<IconFolder class="size-4" />
		{:else}
			{ext(file.path)}
		{/if}
	</div>
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="truncate text-sm font-medium">{file.name}</span>
		<span class="truncate font-mono text-xs text-muted-foreground">{file.path}</span>
	</div>
	<span class="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
		{formatBytes(file.size)}
	</span>
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
