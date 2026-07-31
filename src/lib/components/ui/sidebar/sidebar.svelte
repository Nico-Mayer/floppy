<script lang="ts">
	// PATCHED (not from the shadcn-svelte registry): the mobile branch below uses a
	// vaul Drawer instead of a Sheet, so the navigation drawer can be dragged shut.
	// A Sheet has no close gesture at all — only the scrim, a nav choice, or
	// hardware back. `shadcn-svelte update sidebar` will overwrite this file; the
	// recovery checklist is design decision D5 in the frontend-mobile-polish change.
	//
	// Five things here are load-bearing and easy to lose in a re-apply:
	//   - data-slot="sidebar" AND data-mobile="true": the Android back handler in
	//     +layout.svelte matches on both to decide the drawer owns the back press.
	//   - shouldScaleBackground={false}: scaling the whole app behind a nav drawer
	//     is the wrong effect (it is meant for bottom sheets).
	//   - an sr-only Drawer.Title: vaul warns without one.
	//   - the caller's class, which offsets the drawer below the app bar.
	//   - before:hidden, which kills the inset floating card drawer-content.svelte
	//     paints. That card is right for a bottom sheet and wrong for a full-height
	//     nav drawer, and neither override below removes it: tailwind-merge has no
	//     conflict group for `before:*`, so `p-4`->`p-0` and `bg-transparent`->
	//     `bg-sidebar` pass it straight through. Nor does its own `-z-10` hide it —
	//     the content element is `fixed z-50` and so opens a stacking context, and
	//     inside one the element's background paints first and negative-z children
	//     paint on top of it. Suppressed here rather than in drawer-content.svelte
	//     on purpose: that file is unpatched today, and responsive-dialog (the only
	//     other consumer, a bottom sheet) wants the card.
	// Safe-area padding for this drawer lives in layout.css, keyed on
	// [data-vaul-drawer-direction='left'].
	//
	// Opening is still a snap via the edge swipe, not a tracked drag: vaul's
	// pointer handling only exists while the drawer is open, so there is no public
	// way to hand it an in-flight opening gesture.
	import * as Drawer from "$lib/components/ui/drawer/index.js";
	import { cn, type WithElementRef } from "$lib/utils.js";
	import { SIDEBAR_WIDTH_MOBILE } from "./constants.js";
	import { useSidebar } from "./context.svelte.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		side = "left",
		variant = "sidebar",
		collapsible = "offcanvas",
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		side?: "left" | "right";
		variant?: "sidebar" | "floating" | "inset";
		collapsible?: "offcanvas" | "icon" | "none";
	} = $props();

	const sidebar = useSidebar();
</script>

{#if collapsible === "none"}
	<div
		class={cn(
			"flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
			className
		)}
		bind:this={ref}
		{...restProps}
	>
		{@render children?.()}
	</div>
{:else if sidebar.isMobile}
	<Drawer.Root
		direction={side}
		shouldScaleBackground={false}
		bind:open={() => sidebar.openMobile, (v) => sidebar.setOpenMobile(v)}
		{...restProps}
	>
		<Drawer.Content
			bind:ref
			data-sidebar="sidebar"
			data-slot="sidebar"
			data-mobile="true"
			class={cn(
				"w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground before:hidden",
				className
			)}
			style="--sidebar-width: {SIDEBAR_WIDTH_MOBILE};"
		>
			<Drawer.Title class="sr-only">Sidebar</Drawer.Title>
			<Drawer.Description class="sr-only">Displays the mobile sidebar.</Drawer.Description>
			<div class="flex h-full w-full flex-col">
				{@render children?.()}
			</div>
		</Drawer.Content>
	</Drawer.Root>
{:else}
	<div
		bind:this={ref}
		class="group peer hidden text-sidebar-foreground md:block"
		data-state={sidebar.state}
		data-collapsible={sidebar.state === "collapsed" ? collapsible : ""}
		data-variant={variant}
		data-side={side}
		data-slot="sidebar"
	>
		<!-- This is what handles the sidebar gap on desktop -->
		<div
			data-slot="sidebar-gap"
			class={cn(
				"transition-[width] duration-200 ease-linear relative w-(--sidebar-width) bg-transparent",
				"group-data-[collapsible=offcanvas]:w-0",
				"group-data-[side=right]:rotate-180",
				variant === "floating" || variant === "inset"
					? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
					: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
			)}
		></div>
		<div
			data-slot="sidebar-container"
			class={cn(
				"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
				side === "left"
					? "start-0 group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]"
					: "end-0 group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]",
				// Adjust the padding for floating and inset variants.
				variant === "floating" || variant === "inset"
					? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
					: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-e group-data-[side=right]:border-s",
				className
			)}
			{...restProps}
		>
			<div
				data-sidebar="sidebar"
				data-slot="sidebar-inner"
				class="bg-sidebar group-data-[variant=floating]:rounded-2xl group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border flex size-full flex-col"
			>
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
