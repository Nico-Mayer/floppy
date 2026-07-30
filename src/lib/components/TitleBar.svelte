<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { nav } from '$lib/nav.svelte'
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
	import MenuIcon from '@lucide/svelte/icons/menu'
	import MinusIcon from '@lucide/svelte/icons/minus'
	import SquareIcon from '@lucide/svelte/icons/square'
	import XIcon from '@lucide/svelte/icons/x'
	import { Window } from '$lib/ipc'

	// On Windows the window is frameless (see main.go) and we render our own
	// window controls; on macOS the native traffic lights need a spacer.
	const isWindows = navigator.userAgent.includes('Windows')
	const isMac = navigator.userAgent.includes('Mac')

	// A hamburger toggles the nav (a drawer on mobile, a collapse on desktop) — a
	// clearer affordance than an avatar. On Windows it sits on the left, away from
	// the min/max/close cluster; on macOS/mobile it sits on the right. Hidden once
	// the sidebar is force-open (lg+), where it can't collapse anyway.
	const sidebar = useSidebar()
</script>

{#snippet menuToggle()}
	<Button
		variant="ghost"
		size="icon"
		class="size-8 lg:hidden"
		aria-label="Menu"
		onclick={() => sidebar.toggle()}
	>
		<MenuIcon />
	</Button>
{/snippet}

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
		<!-- In-app back, leftmost when there's history to pop. No browser chrome or
		     hardware back in the webview, so this is the way back on mobile. -->
		{#if nav.canGoBack}
			<Button
				variant="ghost"
				size="icon"
				class="size-8 md:hidden"
				aria-label="Back"
				onclick={() => nav.back()}
			>
				<ArrowLeftIcon />
			</Button>
		{/if}
		<!-- Windows: toggle on the left. -->
		{#if isWindows}
			{@render menuToggle()}
		{/if}
		<div class="flex-1" data-tauri-drag-region></div>
		<!-- macOS / mobile: toggle on the right. -->
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
