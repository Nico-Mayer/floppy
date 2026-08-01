<script lang="ts">
	import type { ProgressEvent } from '$lib/ipc'
	import { Progress } from '$lib/components/ui/progress'
	import { Spinner } from '$lib/components/ui/spinner'
	import { normal } from '$lib/motion'
	import { Spring } from 'svelte/motion'
	import { fade } from 'svelte/transition'
	import { formatBytes, formatDuration, formatRate } from './format'

	let {
		progress = null,
		stats = null,
		label
	}: {
		progress?: number | null
		stats?: ProgressEvent | null
		label: string
	} = $props()

	// A spring, not a tween: a byte rate fluctuates, and linear interpolation over a
	// fixed duration turns that into visible stepping. Tuned soft and well damped so
	// it trails the real figure smoothly rather than chasing every wobble.
	const eased = Spring.of(() => progress ?? 0, { stiffness: 0.08, damping: 0.9 })

	// Clamped, because a spring can overshoot and a bar reading 101% is worse than a
	// stiff one. No monotonic high-water mark on top of that: it would have to be
	// reset when a transfer starts over, and at this damping any dip after the
	// overshoot is well under a percent, which the rounding below hides anyway.
	const value = $derived(Math.min(100, Math.max(0, eased.current)))
	let shown = $derived(Math.round(value))

	// "128 MB / 2.1 GB · 12 MB/s · 2m left" — rate and ETA only join in once
	// enough bytes have moved for them to be measurable.
	let detail = $derived.by(() => {
		if (!stats) return ''
		const parts = [`${formatBytes(stats.sent)} / ${formatBytes(stats.total)}`]
		if (stats.bps > 0) parts.push(formatRate(stats.bps))
		if (stats.eta >= 0) parts.push(`${formatDuration(stats.eta)} left`)
		return parts.join(' · ')
	})
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-4" in:fade={{ duration: normal() }}>
	{#if progress !== null}
		<p class="text-4xl font-bold tracking-tight tabular-nums">
			{shown}<span class="text-xl">%</span>
		</p>
		<Progress {value} class="w-2/3 *:data-[slot=progress-indicator]:bg-(--tint)" />
		{#if detail}
			<p class="font-mono text-xs tabular-nums">{detail}</p>
		{/if}
	{:else}
		<Spinner class="size-8 text-(--tint-fg)" />
	{/if}
	<p class="font-mono text-xs text-muted-foreground">{label}</p>
</div>
