<script lang="ts">
	import { Spinner } from '$lib/components/ui/spinner'
	import { normal } from '$lib/motion'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import { fade } from 'svelte/transition'

	let {
		name,
		accepted
	}: {
		name: string
		/** croc has a room, so the peer said yes and is joining it. */
		accepted: boolean
	} = $props()
</script>

<!-- Both pre-transfer states of a device send. Deliberately no code and no QR:
     the phrase is derived from the pairing keys and only this one peer is meant
     to have it, so there is nothing here for a human to read out. -->
<div class="flex flex-1 flex-col items-center justify-center gap-6" in:fade={{ duration: normal() }}>
	<div class="flex size-20 items-center justify-center rounded-2xl border bg-muted/40">
		<LaptopIcon class="size-9 text-(--tint-fg)" />
	</div>

	<div class="flex flex-col items-center gap-1.5 text-center">
		<p class="animate-pop text-lg font-bold tracking-tight">
			{accepted ? 'Accepted' : 'Waiting for approval'}
		</p>
		<p class="max-w-64 text-xs text-muted-foreground">
			{#if accepted}
				Connecting to <span class="font-medium text-foreground">{name}</span> — the transfer starts on its own.
			{:else}
				<span class="font-medium text-foreground">{name}</span> has to accept before anything leaves this device.
			{/if}
		</p>
	</div>

	<div class="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
		<Spinner class="size-3.5" />
		{accepted ? 'connecting' : 'awaiting accept'}
	</div>
</div>
