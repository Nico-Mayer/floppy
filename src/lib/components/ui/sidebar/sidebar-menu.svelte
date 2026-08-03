<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLUListElement>, HTMLUListElement> = $props();
</script>

<!-- PATCHED (registry is `gap-0.5`): rows sit 4px apart so the roomier scale in
     sidebar-menu-button.svelte reads as separate targets instead of one slab. -->
<ul
	bind:this={ref}
	data-slot="sidebar-menu"
	data-sidebar="menu"
	class={cn("gap-1 flex w-full min-w-0 flex-col", className)}
	{...restProps}
>
	{@render children?.()}
</ul>
