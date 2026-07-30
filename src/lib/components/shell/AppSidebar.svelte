<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import LoginView from '$lib/components/auth/LoginView.svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { pairing } from '$lib/pairing-app.svelte'
	import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
	import Clock3Icon from '@lucide/svelte/icons/clock-3'
	import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
	import SettingsIcon from '@lucide/svelte/icons/settings'
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check'
	import UserIcon from '@lucide/svelte/icons/user'

	// Nav is the old account view-stack turned into real routes. Order puts the
	// two things you do (transfer, pair) above the two you check (activity,
	// settings).
	const items = [
		{ href: '/', label: 'Transfer', icon: ArrowLeftRightIcon, hint: 'Send & receive' },
		{ href: '/devices', label: 'Devices', icon: MonitorSmartphoneIcon, hint: 'Send without a code' },
		{ href: '/activity', label: 'Activity', icon: Clock3Icon, hint: 'Recent transfers' },
		{ href: '/settings', label: 'Settings', icon: SettingsIcon, hint: 'Preferences' }
	] as const

	// Exact match — every route is a leaf, so no prefix ambiguity to resolve.
	const pathname = $derived(page.url.pathname)

	let signInOpen = $state(false)

	const sidebar = useSidebar()

	// On mobile the sidebar is a full-screen drawer; collapse it once a
	// destination is chosen so navigation is one tap, not two.
	function afterNavigate() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false)
	}

	// Taller, roomier rows on touch (44px min target); back to compact on desktop.
	const rowClass = 'h-12 gap-3 rounded-lg text-[15px] md:h-9 md:text-sm'
</script>

<!-- Below the titlebar on desktop; a full-screen drawer on mobile (like the old
     account sheet). -->
<Sidebar.Root
	collapsible="offcanvas"
	class="top-(--header-height)! h-[calc(100svh-var(--header-height))]! max-sm:w-full!"
>
	<Sidebar.Header class="gap-0 p-3">
		<div class="flex items-center gap-2.5">
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-xl font-heading text-lg font-black text-primary-foreground shadow-sm select-none"
			>
				<img src="maybe-logo.png" alt="" />
			</div>
			<div class="flex min-w-0 flex-col leading-tight">
				<span class="font-heading text-sm font-black tracking-tight uppercase">Floppy</span>
				<span class="truncate text-[11px] text-muted-foreground">no cloud · peer to peer</span>
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content class="px-2">
		<Sidebar.Group>
			<Sidebar.GroupLabel>Menu</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu class="gap-1">
					{#each items as item (item.href)}
						{@const active = pathname === item.href}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={active} tooltipContent={item.label} class={rowClass}>
								{#snippet child({ props })}
									<a href={resolve(item.href)} {...props} onclick={afterNavigate}>
										<item.icon />
										<span class="flex min-w-0 flex-col leading-tight">
											<span class="truncate">{item.label}</span>
											<span
												class="truncate text-xs font-normal text-muted-foreground group-data-[collapsible=icon]:hidden md:hidden"
											>
												{item.hint}
											</span>
										</span>
										<ChevronRightIcon
											class="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity md:hidden {active
												? 'opacity-60'
												: ''}"
										/>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
							{#if item.href === '/devices' && pairing.available && pairing.devices.length > 0}
								<Sidebar.MenuBadge>{pairing.devices.length}</Sidebar.MenuBadge>
							{/if}
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="gap-2 p-2">
		<div
			class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
		>
			<ShieldCheckIcon class="size-3.5 shrink-0" />
			<span>Encrypted, straight to their device.</span>
		</div>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<!-- Placeholder sign-in: real auth isn't wired yet, so this opens the
				     preview form. Lives in the footer so it's out of the main nav. -->
				<Sidebar.MenuButton size="lg" class="h-12 gap-3" onclick={() => (signInOpen = true)}>
					<!-- No avatar image while signed out: a face would misrepresent the
					     empty account, and fetching one from the cloud is at odds with the
					     app's peer-to-peer, no-cloud promise. The icon fallback stands in. -->
					<Avatar.Root class="size-8 rounded-lg">
						<Avatar.Image src="https://api.dicebear.com/10.x/initial-face/svg?seed=Nico" alt="" />
						<Avatar.Fallback class="rounded-lg"><UserIcon class="size-4" /></Avatar.Fallback>
					</Avatar.Root>
					<div class="flex min-w-0 flex-col text-left leading-tight">
						<span class="truncate font-medium">Not signed in</span>
						<span class="truncate text-xs text-muted-foreground">Sign in to sync devices</span>
					</div>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>

<Dialog.Root bind:open={signInOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Sign in</Dialog.Title>
			<Dialog.Description>Keep your paired devices in sync across installs.</Dialog.Description>
		</Dialog.Header>
		<LoginView />
	</Dialog.Content>
</Dialog.Root>
