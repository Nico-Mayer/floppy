<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Drawer from '$lib/components/ui/drawer'
	import type { Snippet } from 'svelte'
	import { isDesktop } from './context'

	let {
		class: className,
		children,
		...restProps
	}: { class?: string; children: Snippet } & Record<string, any> = $props()
</script>

{#if isDesktop()}
	<Dialog.Header class={className} {...restProps}>{@render children()}</Dialog.Header>
{:else}
	<Drawer.Header class={className} {...restProps}>{@render children()}</Drawer.Header>
{/if}
