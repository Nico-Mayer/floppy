<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import LoginView from '$lib/components/auth/LoginView.svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { navItems as items } from '$lib/nav-items'
	import { pairing } from '$lib/pairing-app.svelte'
	import UserIcon from '@lucide/svelte/icons/user'

	// The app's one navigation surface: a fixed sidebar on desktop (collapsible to
	// an icon rail) and the same thing as a left drawer on a phone. Destinations
	// live in nav-items.ts so there is a single source of truth.
	//
	// Structure follows the shadcn-svelte sidebar contract so the icon rail renders
	// correctly: brand and account rows are `size="lg"` menu buttons (they collapse
	// to a centered size-8 tile), and each nav row is `<a><icon/><span>label</span></a>`
	// — one span, so the component's own `group-data-[collapsible=icon]` rules hide
	// the label and centre the icon. No custom heights fight that.

	// Exact match — every route is a leaf, so no prefix ambiguity to resolve.
	const pathname = $derived(page.url.pathname)

	let signInOpen = $state(false)

	const sidebar = useSidebar()

	// On mobile the sidebar is a drawer; collapse it once a destination is chosen
	// so navigation is one tap, not two. Unconditional: openMobile only drives the
	// mobile Sheet, so closing it is a no-op on desktop (the rail stays put).
	function afterNavigate() {
		sidebar.setOpenMobile(false)
	}
</script>

<!-- Fixed below the app header on desktop (collapsible to an icon rail); a Sheet
     drawer on mobile. The offset keeps the drawer below the header on every size,
     so the app bar stays visible above it instead of being covered. -->
<Sidebar.Root collapsible="icon" class="top-(--header-height)! h-[calc(100svh-var(--header-height))]!">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>Floppy</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Menu</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each items as item (item.href)}
						{@const active = pathname === item.href}
						<Sidebar.MenuItem>
							<!-- 44px touch target on the mobile drawer, compact on desktop; the
							     rail overrides both to a square size-8 (base variant). -->
							<Sidebar.MenuButton isActive={active} tooltipContent={item.label} class="h-11 md:h-9">
								{#snippet child({ props })}
									<!-- onclick after the spread so it wins over any handler the menu
									     button / tooltip trigger passes in, and always runs. -->
									<a href={resolve(item.href)} {...props} onclick={afterNavigate}>
										<item.icon />
										<span>{item.label}</span>
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

	<!-- Clear the home indicator / gesture bar on mobile (0 on desktop). The
	     drawer sheet uses data-slot="sidebar", so the generic sheet safe-area rule
	     in layout.css doesn't reach it. -->
	<Sidebar.Footer class="pb-(--safe-bottom)">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<!-- Placeholder sign-in: real auth isn't wired yet, so this opens the
				     preview form. Lives in the footer so it's out of the main nav. -->
				<Sidebar.MenuButton size="lg" tooltipContent="Sign in" onclick={() => (signInOpen = true)}>
					<!-- No avatar image while signed out: a face would misrepresent the
					     empty account, and fetching one from the cloud is at odds with the
					     app's peer-to-peer, no-cloud promise. The icon fallback stands in. -->
					<Avatar.Root class="size-8 rounded-lg">
						<Avatar.Image src="https://api.dicebear.com/10.x/initial-face/svg?seed=Nico" alt="" />
						<Avatar.Fallback class="rounded-lg"><UserIcon class="size-4" /></Avatar.Fallback>
					</Avatar.Root>
					<div class="flex flex-col leading-tight">
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
