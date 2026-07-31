<script lang="ts">
	import StubMark from '$lib/components/shell/StubMark.svelte'

	// A route's title and description, in one place so wording, sizing and spacing
	// cannot drift between pages. A route whose content carries its own title
	// (Transfer) simply omits this.

	let {
		title,
		description,
		stub = false
	}: {
		title: string
		description?: string
		/** Marks the screen as a preview whose controls are not wired up yet. */
		stub?: boolean
	} = $props()
</script>

<div class="flex flex-col gap-1">
	<div class="flex items-center gap-2">
		<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
		{#if stub}
			<StubMark />
		{/if}
	</div>
	{#if description}
		<p class="text-sm text-muted-foreground">{description}</p>
	{/if}
</div>
