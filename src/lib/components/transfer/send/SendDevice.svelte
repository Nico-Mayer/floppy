<script lang="ts">
	import PendingHint from '$lib/components/feedback/PendingHint.svelte'
	import DeviceGlyph from '../DeviceGlyph.svelte'
	import { normal } from '$lib/motion'
	import { fade } from 'svelte/transition'

	let {
		name,
		accepted
	}: {
		name: string
		/** The peer said yes and is joining, so we're connecting rather than waiting. */
		accepted: boolean
	} = $props()
</script>

<!-- Both pre-transfer states of a device send. Deliberately no code and no QR:
     the connection is derived from the pairing keys and only this one peer is
     meant to have it, so there is nothing here for a human to read out. -->
<div class="flex flex-1 flex-col items-center justify-center gap-6" in:fade={{ duration: normal() }}>
	<DeviceGlyph />

	<div class="flex flex-col items-center gap-1.5 text-center">
		<p class="animate-pop text-lg font-bold tracking-tight">
			{accepted ? 'They said yes' : 'Waiting for a yes'}
		</p>
		<p class="max-w-64 text-xs text-muted-foreground">
			{#if accepted}
				Connecting to <span class="font-medium text-foreground">{name}</span>. Your files start moving on
				their own.
			{:else}
				<span class="font-medium text-foreground">{name}</span> has to say yes before anything leaves this device.
			{/if}
		</p>
	</div>

	<PendingHint label={accepted ? 'connecting' : 'waiting for a yes'} />
</div>
