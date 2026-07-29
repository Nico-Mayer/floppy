<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import { fast } from '$lib/motion'
	import { app } from '$lib/transfer-app.svelte'
	import PlusIcon from '@lucide/svelte/icons/plus'
	import { flip } from 'svelte/animate'
	import FileCard from '../FileCard.svelte'
	import Mascot from '../Mascot.svelte'

	const send = app.send
</script>

<!-- The idle screen, in its two shapes: nothing picked yet, or a queue to
     review. Both stay editable — the actions zone owns Send. -->
{#if send.files.length === 0}
	<Empty.Root
		role="button"
		tabindex={0}
		class="cursor-pointer border bg-muted/40 p-6 transition-all duration-200 hover:border-send/40 hover:bg-muted/60 in-[.file-drop-target-active]:scale-[1.01] in-[.file-drop-target-active]:border-send in-[.file-drop-target-active]:bg-send/5 @md:p-8"
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
	</Empty.Root>
{:else}
	<!-- A grid of tiles rather than a list: the queue is a set of things, not a
	     ranking, and the tiles let a dozen files stay on screen without the card
	     growing a scrollbar. Column count follows the *card's* width (@container
	     on TransferCard's content), not the viewport, so the panel stays right
	     wherever the shell puts it.
	     auto-rows-min keeps the last row at tile height instead of stretching it
	     to fill the leftover space. -->
	<!-- Column count is chosen to keep a tile at roughly 150–200px wide at every
	     card width, so the preview box never collapses to a thumbnail-sized square:
	     2 up on a phone (≈315px of card → 153px tiles), 3 from 32rem, 4 from 42rem,
	     5 from 48rem, 6 on a full-width desktop card (≈1250px → 200px tiles).
	     Bumping earlier — 3 up at 24rem — would drop tiles to ~125px. -->
	<div
		class="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto @lg:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6"
	>
		<!-- flip is the queue's only motion: tiles slide between cells when one is
		     removed. The tiles themselves have no enter/exit transition on purpose —
		     see the note in FileCard. -->
		{#each send.files as file (file.path)}
			<div class="h-full" animate:flip={{ duration: fast() }}>
				<FileCard {file} onremove={() => send.removeFile(file.path)} />
			</div>
		{/each}

		<!-- Add lives in the grid as the next empty slot, which is where the eye
		     already is after scanning the queue — and it keeps the anchored actions
		     zone down to the one primary action. Dashed, so it reads as a placeholder
		     rather than a file.
		     Wrapped in the same h-full div FileCard uses so the tile is the same grid
		     item shape as its neighbours: an aspect-ratio box alone in the last row
		     otherwise sizes from its min-content width (auto-rows-min) and collapses
		     shorter than the file tiles, whose h-full wrapper chain pins the height. -->
		<div class="h-full">
			<button
				type="button"
				class="group/add flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-dashed text-muted-foreground transition-colors hover:border-send/40 hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				onclick={() => send.pickFiles()}
			>
				<!-- Same two-part skeleton as FileCard — aspect-ratio preview box over a
				     text footer — so the tile matches its neighbours' height exactly at
				     every column count, including when it sits alone in the last row. -->
				<div class="flex aspect-4/3 items-center justify-center">
					<span
						class="flex size-11 items-center justify-center rounded-xl border border-dashed transition-colors group-hover/add:border-send/40"
					>
						<PlusIcon class="size-5" />
					</span>
				</div>
				<div class="border-t border-dashed px-2.5 py-2 text-left">
					<p class="truncate text-xs font-medium">Add files</p>
					<p class="font-mono text-[10px] text-muted-foreground">or drop them</p>
				</div>
			</button>
		</div>
	</div>
{/if}
