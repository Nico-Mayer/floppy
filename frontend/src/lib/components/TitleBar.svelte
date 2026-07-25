<script lang="ts">
	import { SHOW_SIDEBAR } from '$lib/flags'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import { toggleMode } from 'mode-watcher'
	import { MoonIcon, SidebarSimpleIcon, SunIcon } from 'phosphor-svelte'
	const sidebar = Sidebar.useSidebar()
</script>

<header
	class="bg-background sticky top-0 z-50 flex w-full items-center border-b"
	style="--wails-draggable:drag"
>
	<div class="flex h-(--header-height) w-full items-center gap-2 px-4">
		<div class="w-20"></div>
		{#if SHOW_SIDEBAR}
			<Button class="size-8" variant="ghost" size="icon" onclick={sidebar.toggle}>
				{#if sidebar.open}
					<SidebarSimpleIcon weight="fill" />
				{:else}
					<SidebarSimpleIcon />
				{/if}
			</Button>
		{/if}
		<span class="text-sm font-medium select-none">Project Bibor</span>
		<div class="flex-1"></div>
		<div style="--wails-draggable:no-drag">
			<Button
				class="size-8"
				variant="ghost"
				size="icon"
				onclick={toggleMode}
				aria-label="Toggle theme"
			>
				<SunIcon class="block dark:hidden" />
				<MoonIcon class="hidden dark:block" />
			</Button>
		</div>
	</div>
</header>
