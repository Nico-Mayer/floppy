<script lang="ts" module>
	// The app's whole spinner scale (`feedback`: pending indications come from
	// shared primitives). Call sites pick a name, never a raw size class:
	// inline — beside text or inside a control; control — a waiting control or
	// small surface; panel — the centred wait of a whole panel.
	export type SpinnerSize = "inline" | "control" | "panel";

	const sizeClass: Record<SpinnerSize, string> = {
		inline: "size-4",
		control: "size-5",
		panel: "size-8",
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import type { SVGAttributes } from "svelte/elements";

	let {
		class: className,
		role = "status",
		size = "inline",
		// we add name, color, and stroke for compatibility with different icon libraries props
		name,
		color,
		stroke,
		"aria-label": ariaLabel = "Loading",
		...restProps
	}: Omit<SVGAttributes<SVGSVGElement>, "size"> & { size?: SpinnerSize } = $props();
</script>

<Loader2Icon {role} name={name === null ? undefined : name} color={color === null ? undefined : color} stroke={stroke === null ? undefined : stroke} aria-label={ariaLabel} class={cn(sizeClass[size], "animate-spin", className)} {...restProps} />
