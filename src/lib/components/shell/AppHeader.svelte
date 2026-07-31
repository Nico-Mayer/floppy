<script lang="ts">
	import { page } from '$app/state'
	import { Button } from '$lib/components/ui/button/index.js'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { Window } from '$lib/ipc'
	import { titleFor } from '$lib/nav-items'
	import { isMac, isMobile, isWindows } from '$lib/platform'
	import MenuIcon from '@lucide/svelte/icons/menu'
	import MinusIcon from '@lucide/svelte/icons/minus'
	import SquareIcon from '@lucide/svelte/icons/square'
	import XIcon from '@lucide/svelte/icons/x'

	// The one header for every platform. It has no window to drag on a phone and
	// no in-app back anywhere (navigation is flat), so the only shared control is
	// the menu button that toggles the sidebar — a rail on desktop, a drawer on a
	// phone. Everything else is per-platform chrome: a status-bar-safe app bar on
	// mobile, the macOS traffic-light spacer + drag region, or the Windows
	// min/max/close cluster on a frameless window.
	const sidebar = useSidebar()
	const title = $derived(titleFor(page.url.pathname))
</script>

{#snippet menuToggle()}
	<Button
		variant="ghost"
		size="icon"
		class="size-8"
		aria-label="Menu"
		onclick={() => sidebar.toggle()}
		hidden={sidebar.openMobile}
	>
		<MenuIcon />
	</Button>
{/snippet}

{#if isMobile}
	<!-- Plain app bar: paints under the status bar and pads itself down by the top
	     inset so its background sits behind the clock and battery. --header-height
	     carries that total, which is what overlays portaled onto <body> offset
	     against. The mobile nav sheet is full height, so it covers this bar (and
	     the menu button) while open — closing is by the scrim, a nav choice, or
	     the back gesture. -->
	<header
		class="sticky top-0 z-60 flex h-(--header-height) shrink-0 items-center gap-1 border-b bg-background pt-(--safe-top) pr-[calc(var(--safe-right)+--spacing(2))] pl-[calc(var(--safe-left)+--spacing(2))]"
	>
		{@render menuToggle()}
		<h1 class="truncate px-1 font-heading text-lg font-bold tracking-tight">{title}</h1>
	</header>
{:else}
	<!-- pointer-events-auto: an open modal locks body scroll, which also sets
	     `pointer-events: none` on <body> and re-enables it only on the overlay and
	     the panel. The window frame has to opt back in, or the titlebar goes dead
	     while a dialog is open — mousedown then lands on <html> instead, so Tauri
	     sees no drag region and the window cannot be dragged, and the Windows
	     min/max/close buttons stop responding too.
	     data-tauri-drag-region: only the element the mousedown hits drags, so it
	     goes on the empty zones (spacers), never on the buttons. -->
	<header
		class="pointer-events-auto sticky top-0 z-60 flex w-full items-center border-b bg-background"
		data-tauri-drag-region
	>
		<div class="flex h-(--header-height) w-full items-center gap-2 pr-2 pl-3" data-tauri-drag-region>
			<!-- Clears the macOS traffic lights (positioned in tauri.conf.json). -->
			{#if isMac}
				<div class="w-20" data-tauri-drag-region></div>
			{/if}
			<!-- Windows: menu on the left, away from the min/max/close cluster. -->
			{#if isWindows}
				{@render menuToggle()}
			{/if}
			<div class="flex-1" data-tauri-drag-region></div>
			<!-- macOS/Linux: menu on the right. -->
			{#if !isWindows}
				{@render menuToggle()}
			{/if}
			{#if isWindows}
				<div class="flex items-center gap-1">
					<Button
						class="size-8"
						variant="ghost"
						size="icon"
						onclick={() => Window.Minimise()}
						aria-label="Minimize"
					>
						<MinusIcon />
					</Button>
					<Button
						class="size-8"
						variant="ghost"
						size="icon"
						onclick={() => Window.ToggleMaximise()}
						aria-label="Maximize"
					>
						<SquareIcon />
					</Button>
					<Button
						class="size-8 hover:bg-destructive hover:text-white"
						variant="ghost"
						size="icon"
						onclick={() => Window.Close()}
						aria-label="Close"
					>
						<XIcon />
					</Button>
				</div>
			{/if}
		</div>
	</header>
{/if}
