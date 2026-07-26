<script lang="ts">
	import type { TransferStats } from '$bindings/bibor/models'
	import { Progress } from '$lib/components/ui/progress'
	import { IconLoader2 } from '@tabler/icons-svelte'
	import { Tween } from 'svelte/motion'
	import { formatBytes, formatDuration, formatRate } from './format'
	import type { Accent } from './types'

	let {
		accent,
		progress = null,
		stats = null,
		label
	}: {
		accent: Accent
		progress?: number | null
		stats?: TransferStats | null
		label: string
	} = $props()

	const tween = Tween.of(() => progress ?? 0, { duration: 1000 })
	let shown = $derived(Math.round(tween.current))

	// "128 MB / 2.1 GB · 12 MB/s · 2m left" — rate and ETA only join in once
	// croc has moved enough bytes for them to be measurable.
	let detail = $derived.by(() => {
		if (!stats) return ''
		const parts = [`${formatBytes(stats.sent)} / ${formatBytes(stats.total)}`]
		if (stats.bps > 0) parts.push(formatRate(stats.bps))
		if (stats.eta >= 0) parts.push(`${formatDuration(stats.eta)} left`)
		return parts.join(' · ')
	})
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-4">
	{#if progress !== null}
		<p class="text-4xl font-bold tracking-tight tabular-nums">
			{shown}<span class="text-xl">%</span>
		</p>
		<Progress
			value={tween.current}
			class="w-2/3 {accent === 'send'
				? '*:data-[slot=progress-indicator]:bg-send'
				: '*:data-[slot=progress-indicator]:bg-receive'}"
		/>
		{#if detail}
			<p class="font-mono text-xs tabular-nums">{detail}</p>
		{/if}
	{:else}
		<IconLoader2
			class="size-8 animate-spin {accent === 'send' ? 'text-send-foreground' : 'text-receive-foreground'}"
		/>
	{/if}
	<p class="font-mono text-xs text-muted-foreground">{label}</p>
</div>
