<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Button } from '$lib/components/ui/button'
	import * as Sheet from '$lib/components/ui/sheet'
	import { IconChevronLeft, IconUser } from '@tabler/icons-svelte'
	import DevicesView from './DevicesView.svelte'
	import LoginView from './LoginView.svelte'
	import MenuView from './MenuView.svelte'
	import SettingsView from './SettingsView.svelte'
	import { titles, type View } from './types'

	let view = $state<View>('menu')
	let open = $state(false)

	// Reopening always lands on the hub, never a stale sub-view.
	function onOpenChange(next: boolean) {
		open = next
		if (!next) view = 'menu'
	}
</script>

<Sheet.Root bind:open {onOpenChange}>
	<Sheet.Trigger
		class="rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		aria-label="Account"
	>
		<Avatar.Root class="size-8">
			<Avatar.Image src="https://api.dicebear.com/10.x/initial-face/svg?seed=Nico"></Avatar.Image>
			<Avatar.Fallback><IconUser class="size-4" /></Avatar.Fallback>
		</Avatar.Root>
	</Sheet.Trigger>

	<!-- The panel always starts below the window titlebar so the OS controls
	     (Windows min/max/close, macOS traffic lights) stay visible and
	     clickable — TitleBar sits above the sheet in z-order. On mobile it goes
	     edge-to-edge, square and borderless, reading like a pushed screen. -->
	<!-- interactOutsideBehavior="ignore": the titlebar sits above the sheet in
	     z-order (Wails drag region), so pressing or dragging the window frame
	     registers as an outside interaction and would dismiss the sheet. Block
	     outside-dismiss entirely; the sheet closes via Esc or the X button. -->
	<Sheet.Content
		interactOutsideBehavior="ignore"
		class="top-(--header-height)! flex h-[calc(100svh-var(--header-height))]! flex-col max-sm:w-full! max-sm:max-w-full! max-sm:border-0!"
	>
		<Sheet.Header class="flex-row items-center gap-1 space-y-0">
			{#if view !== 'menu'}
				<Button
					variant="ghost"
					size="icon-sm"
					class="-ml-1 shrink-0"
					onclick={() => (view = 'menu')}
					aria-label="Back"
				>
					<IconChevronLeft />
				</Button>
			{/if}
			<Sheet.Title>{titles[view]}</Sheet.Title>
		</Sheet.Header>

		<div
			class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 max-sm:pb-[max(--spacing(4),env(safe-area-inset-bottom))]"
		>
			{#if view === 'menu'}
				<MenuView navigate={(v) => (view = v)} />
			{:else if view === 'login'}
				<LoginView />
			{:else if view === 'settings'}
				<SettingsView />
			{:else if view === 'devices'}
				<DevicesView />
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
