<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { Window } from '$lib/ipc'
	import { isMac, isPhoneChrome, isWindows } from '$lib/platform'
	import MenuIcon from '@lucide/svelte/icons/menu'
	import MinusIcon from '@lucide/svelte/icons/minus'
	import SquareIcon from '@lucide/svelte/icons/square'
	import XIcon from '@lucide/svelte/icons/x'

	// Platform chrome, not navigation. It exists to control a window, so on iOS and
	// Android — where there is no window to drag, minimise or close, and the bottom
	// bar already names the destination — it renders nothing at all: the routed
	// content runs to the top safe-area inset and each screen's own heading is the
	// title. Everything below is the macOS traffic-light spacer + drag region, or
	// the Windows min/max/close cluster on a frameless window.
	const sidebar = useSidebar()

	// The menu button toggles the sidebar between expanded and rail, so it is only
	// shown where the sidebar is: below the navigation threshold the bottom bar is
	// the navigation and there is nothing to toggle. Read off the sidebar context
	// so it is the same threshold instance the layout mounts against.
	const showMenu = $derived(!sidebar.isMobile)
</script>

{#snippet menuToggle()}
	{#if showMenu}
		<Button variant="ghost" size="icon" class="size-8" aria-label="Menu" onclick={() => sidebar.toggle()}>
			<MenuIcon />
		</Button>
	{/if}
{/snippet}

{#if !isPhoneChrome}
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
