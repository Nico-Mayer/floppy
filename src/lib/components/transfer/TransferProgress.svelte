<script lang="ts">
	import type { ProgressEvent } from '$lib/ipc'
	import { AnimatedCircularProgressBar } from '$lib/components/magic/animated-circular-progress-bar'
	import { Spinner } from '$lib/components/ui/spinner'
	import { normal } from '$lib/motion'
	import { fade } from 'svelte/transition'
	import { formatBytes } from './format'

	let {
		progress = null,
		stats = null,
		label
	}: {
		progress?: number | null
		stats?: ProgressEvent | null
		label: string
	} = $props()

	// Clamped here and nowhere else. The gauge's own transition cannot overshoot, so
	// there is no spring to correct for — but a percent that arrived above 100 would
	// still be drawn and read as 103%.
	const value = $derived(Math.min(100, Math.max(0, progress ?? 0)))
	const shown = $derived(Math.round(value))
</script>

<!-- Gauge, then what is moving, then the one figure that ticks. The phase word lives in the
     top bar and the percent lives in the ring, so nothing here states the same fact twice:
     no rate, no time estimate, no second progress indicator. -->
<div class="flex flex-1 flex-col items-center justify-center gap-4" in:fade={{ duration: normal() }}>
	{#if progress !== null}
		<!-- The gauge is an SVG with a text node in it and spreads no attributes, so the
		     semantics the bar used to bring live on this wrapper instead: one progressbar,
		     named by whatever is moving, valued by the percent on screen. -->
		<div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown} aria-label={label}>
			<!-- 0.35s rather than the vendored default of 1s: progress samples land several
			     times a second, and a one-second ease would trail the truth the whole way
			     and still be filling after the panel had moved on to the completion screen.
			     The transition stays on under reduced motion on purpose — with progress the
			     movement is the information (`interaction`).
			     Sized off the card's container, like every other panel layout decision. -->
			<AnimatedCircularProgressBar
				{value}
				duration={0.35}
				gaugePrimaryColor="var(--tint)"
				gaugeSecondaryColor="var(--muted)"
				class="size-32 text-3xl @sm:size-40 @sm:text-4xl"
			>
				{#snippet children(percent)}
					<span class="tabular-nums">{percent}<span class="text-[0.55em]">%</span></span>
				{/snippet}
			</AnimatedCircularProgressBar>
		</div>
	{:else}
		<Spinner size="panel" class="text-(--tint-fg)" />
	{/if}

	<!-- Ordinary text, not mono: a long filename set in a monospace read-out is most of what
	     made this line look like a path. The name arrives already cut to a fixed number of
	     characters (see fileLabel), so this line cannot decide the layout's width whatever
	     the container does; `truncate` stays as the belt to that braces. -->
	<p class="max-w-full truncate text-sm">{label}</p>

	{#if stats}
		<!-- The only figure on the screen that moves. Tabular numerals so counting up does
		     not reflow it, and quiet enough that it does not compete with the ring. -->
		<p class="text-xs text-muted-foreground tabular-nums">
			{formatBytes(stats.sent)} / {formatBytes(stats.total)}
		</p>
	{/if}
</div>
