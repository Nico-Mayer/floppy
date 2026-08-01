<script lang="ts">
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import type { Snippet } from 'svelte'

	// A route's title and description, in one place so wording, sizing and spacing
	// cannot drift between pages. A route whose content carries its own title
	// (Transfer) simply omits this.

	let {
		title,
		description,
		stub = false,
		action
	}: {
		title: string
		description?: string
		/** Marks the screen as a preview whose controls are not wired up yet. */
		stub?: boolean
		/**
		 * One control on the title's row, at the trailing edge. The heading owns
		 * where it sits and how far it is from the words; a route only says what it
		 * is. Kept to one, and kept here, so a page that wants a control in its
		 * heading does not grow a heading of its own.
		 */
		action?: Snippet
	} = $props()
</script>

<div class="flex flex-col gap-1">
	<!-- The action sits at the trailing edge rather than beside the words: the title
	     and its marker are one thing to read, and a control between them and the
	     description would read as part of the sentence. -->
	<div class="flex items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2">
			<h1 class="truncate text-2xl font-semibold tracking-tight">{title}</h1>
			{#if stub}
				<StubMark />
			{/if}
		</div>
		{#if action}
			{@render action()}
		{/if}
	</div>
	{#if description}
		<p class="text-sm text-muted-foreground">{description}</p>
	{/if}
</div>
