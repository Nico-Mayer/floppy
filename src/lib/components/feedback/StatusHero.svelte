<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import { Spinner } from '$lib/components/ui/spinner'
	import { normal, shift } from '$lib/motion'
	import CheckIcon from '@lucide/svelte/icons/check'
	import { fade, fly } from 'svelte/transition'

	// The one centred status screen a transfer panel shows when there is no gauge
	// to draw (`feedback`: duplicated patterns exist once). Sibling of EmptyHero:
	// that one is the mascot for a panel with nothing happening yet, this one is a
	// mark for a panel where something is happening or has just finished.
	//
	// The mark is the message. It is the biggest thing on the surface, and the rows
	// under it are deliberately quieter than it — the sentences that used to do the
	// explaining are what this replaced.
	//
	// It is also the app's one completion screen, so: there is deliberately no path
	// variant. Where received files landed is answered by the open-folder action and
	// by Settings, not by an absolute path on the screen that ends the flow.
	//
	// The frame is `Empty.Media variant="icon"` a size up, and both glyphs are the
	// same size inside it, so swapping pending → success mid-screen measures
	// identically and moves nothing. That is load-bearing for the device connect
	// state, which swaps in place rather than changing screens.
	//
	// No action slot on purpose. A transfer panel's primary and destructive
	// controls belong in TransferCard's anchored zone, at one position across every
	// state (`transfer-panel-layout`), so a button rendered here would be the one
	// that moved. Where a hero *does* own its call to action — the Devices screen's
	// empty state — the slot for it is `Empty.Content`, and that surface composes
	// `Empty.*` directly.
	let {
		/**
		 * Which glyph: a spinner while this is still going, a check once it has gone
		 * well. `success` pops on arrival, so it also works as the moment something
		 * is agreed part-way through a screen, not only as an ending.
		 */
		mark,
		/**
		 * The bold line, for a flow that ended and wants a summary. Left out by a
		 * live status, which should not shout.
		 */
		title = '',
		/** The quiet line: who this is with, or what it came to. */
		label = '',
		/**
		 * A quieter aside that turns up late — a wait that has gone on too long. It
		 * arrives on a delay, so it slides in rather than blinking into place.
		 */
		hint = ''
	}: {
		mark: 'pending' | 'success'
		title?: string
		label?: string
		hint?: string
	} = $props()
</script>

<!-- Entrance-only fade: the outgoing state is removed at once, so no two states
     share the card and the layout cannot jump. -->
<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
	<Empty.Root>
		<!-- role="status" here rather than on the spinner: the rows are what there is
		     to announce, and they are also what changes when a state moves on. The
		     spinner's own role and aria-label are suppressed so a screen reader does
		     not get a stray "Loading" beside the sentence. -->
		<Empty.Header role="status">
			<Empty.Media variant="icon" class="size-16">
				{#if mark === 'success'}
					<!-- animate-pop on the icon, not the frame: the icon is newly created
					     here, so the animation runs on mount instead of relying on a class
					     swap. It degrades to a fade under reduced motion (see layout.css),
					     which is why this needs no branch of its own. -->
					<CheckIcon class="size-8 animate-pop text-(--tint-fg)" />
				{:else}
					<!-- Quieter than the check on purpose: a wait is not news. `panel` is
					     the spinner scale's own name for the centred wait of a whole
					     surface, which is exactly what this is. -->
					<Spinner size="panel" aria-hidden="true" role={undefined} class="text-muted-foreground" />
				{/if}
			</Empty.Media>
			{#if title}
				<Empty.Title>{title}</Empty.Title>
			{/if}
			{#if label}
				<Empty.Description>{label}</Empty.Description>
			{/if}
			{#if hint}
				<p class="text-xs text-muted-foreground" transition:fly={{ y: shift(), duration: normal() }}>
					{hint}
				</p>
			{/if}
		</Empty.Header>
	</Empty.Root>
</div>
