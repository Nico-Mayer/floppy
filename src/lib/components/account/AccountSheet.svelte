<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Button } from '$lib/components/ui/button'
	import * as Sheet from '$lib/components/ui/sheet'
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
	import UserIcon from '@lucide/svelte/icons/user'
	import ActivityView from './ActivityView.svelte'
	import DevicesView from './DevicesView.svelte'
	import LoginView from './LoginView.svelte'
	import MenuView from './MenuView.svelte'
	import SettingsView from './SettingsView.svelte'
	import { descriptions, titles, type View } from './types'

	let open = $state(false)
	let view = $state<View>('menu')
</script>

<!-- Closing always resets the view stack, so reopening lands on the hub rather
     than a stale sub-view. `bind:open` owns the state; onOpenChange is only
     here for that side effect. -->
<Sheet.Root
	bind:open
	onOpenChange={(next) => {
		if (!next) view = 'menu'
	}}
>
	<Sheet.Trigger
		class="cursor-pointer rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
		aria-label="Account"
	>
		<Avatar.Root class="size-8 ring ring-accent ring-offset-1">
			<!-- Decorative: the trigger's aria-label already names the control. -->
			<Avatar.Image src="https://api.dicebear.com/10.x/initial-face/svg?seed=Nico" alt="" />
			<Avatar.Fallback><UserIcon class="size-4" /></Avatar.Fallback>
		</Avatar.Root>
	</Sheet.Trigger>

	<!-- Panel *and* overlay start below the window titlebar — that is what
	     --header-height is global for. An overlay left at inset-0 covers the window
	     frame: it dims the OS controls (Windows min/max/close, macOS traffic
	     lights), swallows the Wails drag region, and turns every titlebar press
	     into a press on the backdrop.
	     Clearing the frame is not enough on its own, though: bits decides "outside"
	     from a document-wide pointerdown against the panel's bounding rect, so a
	     press on the titlebar still counts and would dismiss the sheet mid-drag.
	     Hence interactOutsideBehavior "ignore" — and with the frame clear, the
	     overlay is the only outside surface left, so its own click is the
	     dismissal. Filtering bits' own detection by target instead does not work:
	     the handler is debounced by 10ms, so a preventDefault() there lands on an
	     event that has already finished dispatching.
	     Panel height comes from the top/bottom insets the component already sets
	     (h-auto! releases its h-full) rather than a 100svh calc, so there is no
	     viewport unit to resolve against a possibly stale viewport. On mobile it
	     goes edge-to-edge, square and borderless, reading like a pushed screen. -->
	<Sheet.Content
		interactOutsideBehavior="ignore"
		overlayProps={{
			class: 'top-(--header-height)!',
			onclick: () => (open = false)
		}}
		class="top-(--header-height)! flex h-auto! flex-col max-sm:w-full! max-sm:border-0!"
	>
		<!-- p-4 matches the body's px-4 and the close button's right-4, so the
		     title, every view's content, and the X all share one inset. pr-12
		     keeps a long title from running under that button. -->
		<Sheet.Header class="flex-row items-center gap-1 p-4 pr-12">
			{#if view !== 'menu'}
				<Button
					variant="ghost"
					size="icon"
					class="-ml-1 shrink-0"
					onclick={() => (view = 'menu')}
					aria-label="Back"
				>
					<ChevronLeftIcon />
				</Button>
			{/if}
			<Sheet.Title>{titles[view]}</Sheet.Title>
			<Sheet.Description class="sr-only">{descriptions[view]}</Sheet.Description>
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
			{:else if view === 'activity'}
				<ActivityView />
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
