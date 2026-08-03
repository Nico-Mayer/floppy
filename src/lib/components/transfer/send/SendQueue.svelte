<script lang="ts">
	import EmptyHero from '$lib/components/feedback/EmptyHero.svelte'
	import PendingHint from '$lib/components/feedback/PendingHint.svelte'
	import * as Empty from '$lib/components/ui/empty'
	import { fast } from '$lib/motion'
	import { isPhoneChrome } from '$lib/platform'
	import { app } from '$lib/transfer-app.svelte'
	import { flip } from 'svelte/animate'
	import { fade } from 'svelte/transition'
	import FileCard from '../FileCard.svelte'
	import { addFiles } from './add-files.svelte'

	const send = app.send

	// The tiles already queued when this mounted. A tile the user just added gets
	// the arrival treatment; coming back to Send with a full queue replays
	// nothing, because an initial render is calm (`interaction`).
	const initialPaths = new Set(send.files.map((file) => file.path))

	// The empty state goes through addFiles.start() rather than pickFiles(): on a
	// phone that is the sheet offering files or photos, and everywhere else it is
	// the picker, opened directly. It does not know which — see add-files.svelte.ts
	// for why the branch lives there.
	//
	// It is the only add surface in this file. The grid used to end in a dashed add
	// tile; the floating button (AddFilesButton) replaced it on every platform,
	// because the tile was the grid's last item and a long queue scrolled it out of
	// reach exactly when it was wanted.
</script>

<!-- The idle screen, in its two shapes: nothing picked yet, or a queue to
     review. Both stay editable — the actions zone owns Send. -->
{#if send.files.length === 0}
	<!-- Same compact/regular mascot treatment as the receive panel; the whole
	     surface stays the click/drop target. -->
	<EmptyHero
		accent="send"
		role="button"
		tabindex={0}
		class="cursor-pointer border bg-muted/40 transition-all duration-200 hover:border-send/40 hover:bg-muted/60 in-[.file-drop-target-active]:scale-[1.01] in-[.file-drop-target-active]:border-send in-[.file-drop-target-active]:bg-send/5"
		onclick={() => addFiles.start()}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && addFiles.start()}
	>
		<!-- The copy has two shapes, crossfading in one grid cell rather than as two
		     siblings of this flex column — an outgoing element lives until its
		     transition ends, and stacked it would grow the header mid-fade. -->
		<div class="grid *:col-start-1 *:row-start-1">
			{#if send.picking}
				<!-- The empty state says it here rather than in the anchored action zone,
				     which is where the queue view says it. The two views have different
				     problems: with files queued the report has to stand in the Send slot
				     so a half-arrived selection cannot be sent, and with nothing queued
				     there is no Send to block and no action zone to put it in — showing
				     one would make the zone appear and shove this card up as it did.
				     Under the mascot is where the eye already is on this screen. -->
				<div transition:fade={{ duration: fast() }}>
					<PendingHint variant="stack" label="getting files ready" />
				</div>
			{:else}
				<!-- A phone has no drag-and-drop at all: the webview never reports one, so
				     inviting a drop there names something that cannot happen. The wording
				     follows the platform and not the width, so a desktop window dragged
				     narrow keeps the drag copy, because it can still take a drop. -->
				<div transition:fade={{ duration: fast() }} class="flex min-w-0 flex-col items-center gap-2">
					<Empty.Title>{isPhoneChrome ? 'Add files' : 'Drop your files here'}</Empty.Title>
					<Empty.Description>
						{#if isPhoneChrome}
							photos or files, your pick
						{:else}
							or <span class="underline underline-offset-2"> browse </span>
						{/if}
					</Empty.Description>
				</div>
			{/if}
		</div>
	</EmptyHero>
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
	<!-- pb-20, on every platform: the floating add button hangs over this corner
	     everywhere now, and without the padding the last row can never be scrolled
	     clear of it. It is the button's height plus its inset, rounded up.
	     Unconditional rather than `isPhoneChrome &&` because the button is no longer
	     phone-only — the grid used to end in a dashed add tile that desktop reached
	     instead, and the tile is gone. -->
	<!-- The bottom edge fades rather than cutting: the send pill sits right under
	     this, and a hard row of tile corners stopping dead against it reads as two
	     surfaces colliding. A short mask (one gap's worth) softens the meeting
	     point and doubles as the "there is more below" tell while scrolling. -->
	<div
		class="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto mask-b-from-[calc(100%-0.5rem)] pb-20 @lg:grid-cols-3 @2xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6"
	>
		<!-- flip is the queue's only motion: tiles slide between cells when one is
		     removed. The tiles themselves have no enter/exit transition on purpose —
		     see the note in FileCard. -->
		{#each send.files as file (file.path)}
			<div class="h-full" animate:flip={{ duration: fast() }}>
				<FileCard {file} arrived={!initialPaths.has(file.path)} onremove={() => send.removeFile(file.path)} />
			</div>
		{/each}
	</div>
{/if}
