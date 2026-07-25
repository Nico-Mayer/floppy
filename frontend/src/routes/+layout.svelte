<script lang="ts">
	import favicon from '$lib/assets/favicon.svg'
	import AppSidebar from '$lib/components/AppSidebar.svelte'
	import TitleBar from '$lib/components/TitleBar.svelte'
	import { SHOW_SIDEBAR } from '$lib/flags'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { ModeWatcher } from 'mode-watcher'
	import './layout.css'

	let { children } = $props()
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />

<div class="[--header-height:calc(--spacing(13))]">
	<Sidebar.Provider class="flex flex-col">
		<TitleBar></TitleBar>
		<div class="flex flex-1">
			{#if SHOW_SIDEBAR}
				<AppSidebar />
			{/if}
			<Sidebar.Inset class="min-w-0 overflow-x-auto">
				{@render children()}
			</Sidebar.Inset>
		</div>
	</Sidebar.Provider>
</div>
