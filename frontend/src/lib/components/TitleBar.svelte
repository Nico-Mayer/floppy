<script lang="ts">
	import { SHOW_SIDEBAR } from '$lib/flags'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import { SidebarSimpleIcon } from 'phosphor-svelte'
	const sidebar = Sidebar.useSidebar()
</script>

<header class="bg-background sticky top-0 z-50 flex w-full items-center border-b">
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
	</div>
</header>
