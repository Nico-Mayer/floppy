<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import * as Item from '$lib/components/ui/item'
	import { Button } from '$lib/components/ui/button'
	import { fast } from '$lib/motion'
	import { app } from '$lib/transfer-app.svelte'
	import { IconPlus } from '@tabler/icons-svelte'
	import { flip } from 'svelte/animate'
	import FileRow from '../FileRow.svelte'
	import Mascot from '../Mascot.svelte'

	const send = app.send
</script>

<!-- The idle screen, in its two shapes: nothing picked yet, or a queue to
     review. Both stay editable — the actions zone owns Send. -->
{#if send.files.length === 0}
	<Empty.Root
		role="button"
		tabindex={0}
		class="relative cursor-pointer border bg-muted/40 p-6 transition-all duration-200 hover:border-send/40 hover:bg-muted/60 in-[.file-drop-target-active]:scale-[1.01] in-[.file-drop-target-active]:border-send in-[.file-drop-target-active]:bg-send/5 @md:p-8"
		onclick={() => send.pickFiles()}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && send.pickFiles()}
	>
		<!-- Same compact/regular mascot treatment as the receive panel; the whole
		     surface stays the click/drop target. -->
		<Empty.Header class="@md:max-w-none @md:gap-6">
			<Empty.Media class="@md:mb-0">
				<Mascot accent="send" class="size-20 @md:size-24" />
			</Empty.Media>
			<div class="flex min-w-0 flex-col items-center gap-2">
				<Empty.Title>Drag files here</Empty.Title>
				<Empty.Description>
					or <span class="underline underline-offset-2"> browse </span>
				</Empty.Description>
			</div>
		</Empty.Header>
		<Button class="absolute right-4 bottom-4 bg-send" size="icon-lg">
			<IconPlus />
		</Button>
	</Empty.Root>
{:else}
	<Item.Group class="min-h-0 flex-1 overflow-y-auto">
		{#each send.files as file (file.path)}
			<div animate:flip={{ duration: fast() }}>
				<FileRow {file} onremove={() => send.removeFile(file.path)} />
			</div>
		{/each}
	</Item.Group>
{/if}
