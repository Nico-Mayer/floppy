<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	// PATCHED (not from the shadcn-svelte registry): `max-md:min-h-11` gives every
	// navigation row a 44px touch target in the mobile drawer. It lives here rather
	// than on the call site (it used to be `class="h-11 md:h-9"` in AppSidebar), so
	// a new row cannot forget it. Now a floor beneath the row height rather than a
	// lift (a `default` row is 48px), kept so the `sm` size cannot slip under it.
	//
	// Width-scoped rather than `pointer-coarse:`, deliberately: at `md` and up this
	// component collapses to a square icon rail, and a coarse-pointer minimum would
	// stretch those tiles out of square on a touchscreen laptop. The drawer only
	// exists below `md`, so scoping to `max-md` targets exactly the rows a finger
	// can reach.
	//
	// PATCHED, the roomier scale: rows are `h-12`/`h-16` (registry: `h-9`/`h-14`),
	// icons are `size-5` (registry: `size-4`), the gap is `gap-3`, and a rail tile
	// is `size-12` (registry: `size-8`). Four destinations do not need a dense
	// sidebar. The rail tile pairs with `SIDEBAR_WIDTH_ICON` in constants.ts —
	// 4rem minus the 8px padding of the header, group, and footer.
	//
	// PATCHED, how a row collapses to the rail: everything after the leading glyph
	// is hidden and the glyph is centred in the tile with no padding. The registry
	// instead clips the label with `overflow-hidden` and relies on the glyph
	// exactly filling the padded content box, which made every tile geometry
	// load-bearing — a mark one step off square was silently cut. Centring is
	// size-agnostic, so a row can carry a 16px icon or a 40px avatar. `size-5` is
	// scoped to a direct child so a nested decorative svg (the preview flask in a
	// badge, an avatar fallback) keeps the size it was authored with.
	export const sidebarMenuButtonVariants = tv({
		base: "gap-3 rounded-xl px-3 py-2 text-left text-sm ring-sidebar-ring transition-[width,height,padding] max-md:min-h-11 group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground peer/menu-button group/menu-button flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[collapsible=icon]:[&>*:not(:first-child)]:hidden [&>svg]:size-5 [&>svg]:shrink-0 [&>span:last-child]:truncate",
		variants: {
			variant: {
				default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
			},
			size: {
				default: "h-12 text-sm",
				sm: "h-8 text-xs",
				lg: "h-16 px-3 text-sm",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type SidebarMenuButtonVariant = VariantProps<typeof sidebarMenuButtonVariants>["variant"];
	export type SidebarMenuButtonSize = VariantProps<typeof sidebarMenuButtonVariants>["size"];
</script>

<script lang="ts">
	import { mergeProps } from "bits-ui";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import { cn, type WithElementRef, type WithoutChildrenOrChild } from "$lib/utils.js";
	import { useSidebar } from "./context.svelte.js";
	import type { ComponentProps, Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		child,
		variant = "default",
		size = "default",
		isActive = false,
		tooltipContent,
		tooltipContentProps,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
		isActive?: boolean;
		variant?: SidebarMenuButtonVariant;
		size?: SidebarMenuButtonSize;
		tooltipContent?: Snippet | string;
		tooltipContentProps?: WithoutChildrenOrChild<ComponentProps<typeof Tooltip.Content>>;
		child?: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();

	const sidebar = useSidebar();

	const buttonProps = $derived({
		class: cn(sidebarMenuButtonVariants({ variant, size }), className),
		"data-slot": "sidebar-menu-button",
		"data-sidebar": "menu-button",
		"data-size": size,
		"data-active": isActive,
		...restProps,
	});
</script>

{#snippet Button({ props }: { props?: Record<string, unknown> })}
	{@const mergedProps = mergeProps(buttonProps, props)}
	{#if child}
		{@render child({ props: mergedProps })}
	{:else}
		<button bind:this={ref} {...mergedProps}>
			{@render children?.()}
		</button>
	{/if}
{/snippet}

{#if !tooltipContent}
	{@render Button({})}
{:else}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render Button({ props })}
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content
			side="right"
			align="center"
			hidden={sidebar.state !== "collapsed" || sidebar.isMobile}
			{...tooltipContentProps}
		>
			{#if typeof tooltipContent === "string"}
				{tooltipContent}
			{:else if tooltipContent}
				{@render tooltipContent()}
			{/if}
		</Tooltip.Content>
	</Tooltip.Root>
{/if}
