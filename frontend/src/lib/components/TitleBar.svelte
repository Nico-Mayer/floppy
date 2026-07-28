<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js'
	import { IconMinus, IconMoon, IconSquare, IconSun, IconX } from '@tabler/icons-svelte'
	import { Window } from '@wailsio/runtime'
	import { toggleMode } from 'mode-watcher'

	// On Windows the window is frameless (see main.go) and we render our own
	// window controls; on macOS the native traffic lights need a spacer.
	const isWindows = navigator.userAgent.includes('Windows')
	const isMac = navigator.userAgent.includes('Mac')
</script>

<header
	class="sticky top-0 z-60 flex w-full items-center border-b bg-background"
	style="--wails-draggable:drag"
>
	<div class="flex h-(--header-height) w-full items-center gap-2 pr-2 pl-4">
		{#if isMac}
			<div class="w-20"></div>
		{/if}
		<div class="flex-1"></div>
		<div class="flex items-center gap-1" style="--wails-draggable:no-drag">
			<Button class="size-8" variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
				<IconSun class="block dark:hidden" />
				<IconMoon class="hidden dark:block" />
			</Button>
			{#if isWindows}
				<Button
					class="size-8"
					variant="ghost"
					size="icon"
					onclick={() => Window.Minimise()}
					aria-label="Minimize"
				>
					<IconMinus />
				</Button>
				<Button
					class="size-8"
					variant="ghost"
					size="icon"
					onclick={() => Window.ToggleMaximise()}
					aria-label="Maximize"
				>
					<IconSquare />
				</Button>
				<Button
					class="size-8 hover:bg-destructive hover:text-white"
					variant="ghost"
					size="icon"
					onclick={() => Window.Close()}
					aria-label="Close"
				>
					<IconX />
				</Button>
			{/if}
		</div>
	</div>
</header>
