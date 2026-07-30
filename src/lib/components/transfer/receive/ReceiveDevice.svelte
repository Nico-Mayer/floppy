<script lang="ts">
	import DeviceGlyph from '../DeviceGlyph.svelte'
	import WaitingHint from '../WaitingHint.svelte'
	import { normal } from '$lib/motion'
	import { fade } from 'svelte/transition'
	import { formatBytes } from '../format'
	import { fileCount } from './labels'

	let {
		name,
		files,
		totalBytes
	}: {
		name: string
		files: number
		totalBytes: number
	} = $props()
</script>

<!-- 'connecting' for a device target: the offer is already accepted, so unlike a
     code receive there is nothing to hunt for and nothing to double-check — the
     sender is named and the manifest is known before any bytes arrive. -->
<div class="flex flex-1 flex-col items-center justify-center gap-6" in:fade={{ duration: normal() }}>
	<DeviceGlyph />

	<div class="flex flex-col items-center gap-1.5 text-center">
		<p class="animate-pop text-lg font-bold tracking-tight">Files on the way</p>
		<p class="max-w-64 text-xs text-muted-foreground">
			<span class="font-medium text-foreground">{name}</span>
			is sending {fileCount(files)}{#if totalBytes > 0}&nbsp;· {formatBytes(totalBytes)}{/if}.
		</p>
	</div>

	<WaitingHint label="waiting for sender" />
</div>
