<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import LoginView from '$lib/components/auth/LoginView.svelte'
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { navItems as items, type NavItem } from '$lib/nav-items'
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

	/** The paired-device count, shown on the Devices row once there is one. */
	function showCount(item: NavItem) {
		return item.href === '/devices' && pairing.available && pairing.devices.length > 0
	}
</script>

<!-- Fixed below the app header on desktop (collapsible to an icon rail); a vaul
     Drawer on mobile, which can be dragged shut. The offset keeps the drawer
     below the header on every size, so the app bar stays visible above it instead
     of being covered — and it is why layout.css excludes this drawer from the
     safe-top padding it gives other side surfaces (--header-height already
     includes that inset). -->
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
							<!-- The 44px touch target on the mobile drawer now comes from
							     Sidebar.MenuButton itself, so a new row cannot forget it. The rail
							     still overrides to a square size-8 at md and up. -->
							<Sidebar.MenuButton isActive={active} tooltipContent={item.label}>
								{#snippet child({ props })}
									<!-- onclick after the spread so it wins over any handler the menu
									     button / tooltip trigger passes in, and always runs.
									     A preview destination says so in its accessible name rather than
									     via an extra element: the row must stay
									     `<a><icon/><span>label</span></a>` with exactly one span, or the
									     component's own icon-rail rules cannot hide the label. -->
									<a
										href={resolve(item.href)}
										{...props}
										aria-label={item.stub ? `${item.label}, preview` : undefined}
										onclick={afterNavigate}
									>
										<item.icon />
										<span>{item.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
							<!-- One badge slot per row, so the device count and the preview dot share
							     it rather than stacking on the same corner. No row has both today
							     (Devices is not a preview), but the structure allows it.
							     top-1/2! overrides the component's own `top-1.5`, which is tuned for
							     a 36px row and sits high on the 44px touch row. -->
							{#if showCount(item) || item.stub}
								<Sidebar.MenuBadge class="gap-1.5 max-md:top-1/2! max-md:-translate-y-1/2">
									{#if showCount(item)}
										{pairing.devices.length}
									{/if}
									{#if item.stub}
										<span class="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true"></span>
									{/if}
								</Sidebar.MenuBadge>
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
				<!-- Signing in is a planned feature, not dead scaffolding, so the entry
				     point stays and says it is a preview instead of being removed. Lives
				     in the footer so it's out of the main nav.
				     The wording stays limited to syncing devices between installs: the
				     rendezvous broker is accountless and stateless, and nothing here
				     changes that. -->
				<Sidebar.MenuButton size="lg" tooltipContent="Sign in" onclick={() => (signInOpen = true)}>
					<!-- No avatar image while signed out. A face would misrepresent the
					     empty account, and fetching one from a third party is at odds with
					     the app's peer-to-peer, no-cloud promise, so there is no `src` to
					     fetch: the icon fallback is the whole avatar. -->
					<Avatar.Root class="size-8 rounded-lg">
						<Avatar.Fallback class="rounded-lg"><UserIcon class="size-4" /></Avatar.Fallback>
					</Avatar.Root>
					<div class="flex min-w-0 flex-col leading-tight">
						<span class="truncate font-medium">Not signed in</span>
						<span class="truncate text-xs text-muted-foreground">Sync your devices</span>
					</div>
					<StubMark class="ml-auto" label="Planned" />
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>

<Dialog.Root bind:open={signInOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<!-- Marked in the title, same as a preview route's page header. Signing in
			     would sync your paired devices between installs, and nothing more: the
			     broker stays accountless. -->
			<Dialog.Title class="flex items-center gap-2">
				Sign in
				<StubMark label="Planned" />
			</Dialog.Title>
			<Dialog.Description>Keep your paired devices in sync across installs.</Dialog.Description>
		</Dialog.Header>
		<LoginView />
	</Dialog.Content>
</Dialog.Root>
