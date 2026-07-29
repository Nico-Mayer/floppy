<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import MinusIcon from '@lucide/svelte/icons/minus'
	import SquareIcon from '@lucide/svelte/icons/square'
	import XIcon from '@lucide/svelte/icons/x'
	import { Window } from '@wailsio/runtime'

	// On Windows the window is frameless (see main.go) and we render our own
	// window controls; on macOS the native traffic lights need a spacer.
	const isWindows = navigator.userAgent.includes('Windows')
	const isMac = navigator.userAgent.includes('Mac')
</script>

<!-- pointer-events-auto: an open modal (the account sheet) locks body scroll,
     which also sets `pointer-events: none` on <body> and re-enables it only on
     the overlay and the panel. The window frame has to opt back in, or the
     titlebar goes dead while the sheet is open — mousedown then lands on <html>
     instead, so Wails reads no --wails-draggable and the window cannot be
     dragged (this *is* dragging on frameless Windows; macOS moves natively),
     and the Windows min/max/close buttons below stop responding too. -->
<header
	class="pointer-events-auto sticky top-0 z-60 flex w-full items-center border-b bg-background"
	style="--wails-draggable:drag"
>
	<div class="flex h-(--header-height) w-full items-center gap-2 pr-2 pl-4">
		{#if isMac}
			<div class="w-20"></div>
		{/if}
		<div class="flex-1"></div>
		<div class="flex items-center gap-1" style="--wails-draggable:no-drag">
			{#if isWindows}
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
			{/if}
		</div>
	</div>
</header>
