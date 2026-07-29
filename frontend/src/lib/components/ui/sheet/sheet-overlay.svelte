<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SheetPrimitive.OverlayProps = $props();
</script>

<!-- LOCAL PATCH — `shadcn-svelte update sheet` drops this; re-apply: the overlay
     fades with the panel, where the registry file pops it in with no transition. -->
<SheetPrimitive.Overlay
	bind:ref
	data-slot="sheet-overlay"
	class={cn(
		"bg-black/30 supports-backdrop-filter:backdrop-blur-sm fixed inset-0 z-50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
		className
	)}
	{...restProps}
/>
