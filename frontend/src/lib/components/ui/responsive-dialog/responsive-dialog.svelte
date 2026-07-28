<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Drawer from '$lib/components/ui/drawer'
	import type { Snippet } from 'svelte'
	import { isDesktop } from './context'

	let {
		open = $bindable(false),
		onOpenChange,
		children
	}: {
		open?: boolean
		onOpenChange?: (open: boolean) => void
		children: Snippet
	} = $props()
</script>

{#if isDesktop()}
	<Dialog.Root bind:open {onOpenChange}>
		{@render children()}
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open {onOpenChange}>
		{@render children()}
	</Drawer.Root>
{/if}
