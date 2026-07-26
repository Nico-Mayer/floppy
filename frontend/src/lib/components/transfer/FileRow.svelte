<script lang="ts">
	import type { FileEntry } from '$bindings/floppy/internal/services/models'
	import { Button } from '$lib/components/ui/button'
	import * as Item from '$lib/components/ui/item'
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

<Item.Root variant="outline" size="sm" class="animate-slidein">
	<!-- variant="image" supplies the box; it only sizes <img>, so the folder
	     icon needs its own size. -->
	<Item.Media variant="image" class="border bg-muted font-mono text-[10px] font-bold">
		{#if file.isDir}
			<IconFolder class="size-4" />
		{:else}
			{ext(file.path)}
		{/if}
	</Item.Media>
	<Item.Content>
		<Item.Title>{file.name}</Item.Title>
		<Item.Description class="line-clamp-1 font-mono text-xs" title={file.path}>
			{file.path}
		</Item.Description>
	</Item.Content>
	<Item.Actions>
		<span class="font-mono text-xs text-muted-foreground tabular-nums">
			{formatBytes(file.size)}
		</span>
		<Button
			variant="ghost"
			size="icon-sm"
			class="text-muted-foreground hover:text-destructive"
			onclick={onremove}
			aria-label="Remove file"
		>
			<IconX />
		</Button>
	</Item.Actions>
</Item.Root>
