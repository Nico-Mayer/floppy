<script lang="ts">
	import { page } from '$app/state'
	import { Button } from '$lib/components/ui/button/index.js'
	import { nav } from '$lib/nav.svelte'
	import { titleFor } from '$lib/nav-items'
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'

	// The mobile counterpart of WindowChrome. A phone has no window controls and
	// nothing to drag, so this is a plain app bar instead: where you are, and a
	// way back out of anywhere that isn't a top-level destination.
	//
	// It paints *under* the status bar and pads itself down by the top inset, so
	// the bar's own background sits behind the clock and battery instead of the
	// page content colliding with them. --header-height carries the same total,
	// which is what everything portaled onto <body> offsets against.
	//
	// Switching tabs replaces history rather than pushing it (see BottomNav), so
	// the back arrow only appears for somewhere you actually drilled into.
	const title = $derived(titleFor(page.url.pathname))
</script>

<header
	class="sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-1 border-b bg-background pt-(--safe-top) pr-[calc(var(--safe-right)+--spacing(2))] pl-[calc(var(--safe-left)+--spacing(2))]"
>
	{#if nav.canGoBack}
		<Button variant="ghost" size="icon" class="size-10" aria-label="Back" onclick={() => nav.back()}>
			<ArrowLeftIcon class="size-5" />
		</Button>
	{/if}
	<h1 class="truncate px-2 font-heading text-lg font-bold tracking-tight">{title}</h1>
</header>
