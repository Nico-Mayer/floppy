<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Drawer from '$lib/components/ui/drawer'
	import type { Snippet } from 'svelte'
	import { isDesktop } from './context'

	let { children, ...restProps }: { children: Snippet } & Record<string, any> = $props()
</script>

{#if isDesktop()}
	<Dialog.Trigger {...restProps}>{@render children()}</Dialog.Trigger>
{:else}
	<Drawer.Trigger {...restProps}>{@render children()}</Drawer.Trigger>
{/if}
