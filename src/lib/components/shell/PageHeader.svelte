<script lang="ts">
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import type { Snippet } from 'svelte'

	// The one top bar. Every destination renders its title through this, so
	// wording, sizing and spacing cannot drift between pages — the transfer
	// screens included, whose card used to carry its own header.
	//
	// Compact below `sm`: one row, smaller title, no description line. Width,
	// not platform — a narrow desktop window benefits identically, and max-sm:
	// is how the rest of the shell makes this exact call.

	let {
		title,
		description,
		stub = false,
		accent,
		status,
		action
	}: {
		title: string
		/** Rendered below the title at `sm` and above only. */
		description?: string
		/** Marks the screen as a preview whose controls are not wired up yet. */
		stub?: boolean
		/**
		 * The screen's color identity, drawn as a small tint dot before the
		 * title. Only the transfer screens have one.
		 */
		accent?: 'send' | 'receive'
		/**
		 * What is happening right now, in two or three lowercase words. Lives on
		 * the title row so it survives the compact bar, and is announced politely
		 * because it is the screen's one state sentence. Changes per phase, never
		 * per progress tick.
		 */
		status?: string
		/**
		 * The title row's trailing edge. The heading owns where it sits and how far
		 * it is from the words; a route only says what goes there, so a page that
		 * wants a control in its heading does not grow a heading of its own.
		 *
		 * Usually one control. A route with more than one thing to show renders them
		 * as one group, most urgent first, and keeps them icon-sized and quiet (the
		 * transfer screens do this: a connection warning beside a transfer one).
		 * Never two rows, and never one hidden to make room for another — the row's
		 * height is reserved below and must not change with what is in here.
		 */
		action?: Snippet
	} = $props()
</script>

<div class="flex flex-col gap-1">
	<!-- The action sits at the trailing edge rather than beside the words: the title
	     and its marker are one thing to read, and a control between them and the
	     description would read as part of the sentence. The status is shrink-0 and
	     short by construction, so a long title truncates before it does.
	     The row's floor is the height an icon action takes (size-9, 44px on a
	     coarse pointer), reserved whether or not one is passed: the bar is on
	     every destination, and a page with a control must not stand taller than
	     one without. That floor is also what lets a route's trailing group appear
	     and disappear (a connection warning coming and going) without the bar
	     resizing or anything below it moving. -->
	<div class="flex min-h-9 items-center justify-between gap-3 pointer-coarse:min-h-11">
		<div class="flex min-w-0 items-center gap-2">
			{#if accent}
				<span class="size-3 shrink-0 rounded-full bg-(--tint)" style="--tint: var(--{accent})"></span>
			{/if}
			<h1 class="truncate text-lg font-semibold tracking-tight sm:text-2xl">{title}</h1>
			{#if stub}
				<StubMark />
			{/if}
			{#if status}
				<span
					aria-live="polite"
					class="shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
				>
					{status}
				</span>
			{/if}
		</div>
		{#if action}
			{@render action()}
		{/if}
	</div>
	{#if description}
		<p class="text-sm text-muted-foreground max-sm:hidden">{description}</p>
	{/if}
</div>
