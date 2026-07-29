<script lang="ts">
	import { cn } from '$lib/utils'
	import type { Snippet } from 'svelte'
	import { isDesktop } from './context'

	// Middle content between Header and Footer. On the Drawer, Header/Footer carry
	// their own p-4 on top of the Content's p-4 (so their text sits at 32px); the
	// body matches that inset with px-4. On the Dialog the grid + p-6 already
	// handle spacing, so no extra padding.
	let { class: className, children }: { class?: string; children: Snippet } = $props()
</script>

{#if isDesktop()}
	<div class={className}>{@render children()}</div>
{:else}
	<div class={cn('px-4', className)}>{@render children()}</div>
{/if}
