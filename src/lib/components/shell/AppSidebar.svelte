<script lang="ts">
	import { asset, resolve } from '$app/paths'
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
	//
	// `size="lg"` on those two rows is load-bearing, not a look. In the rail every
	// menu button is forced to `group-data-[collapsible=icon]:size-8!`; the base
	// variant also forces `p-2!`, leaving a 16px content box, while `lg` overrides
	// it to `p-0!` and leaves the full 32px. A nav row survives `default` only
	// because the base carries `[&_svg]:size-4`, which shrinks its Lucide icon to
	// fit — that selector does not match an `<img>` or an Avatar, so demoting the
	// brand or account row to `default` would silently clip the mark.

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
				<!-- The brand carries no destination and performs no action, so it is not a
				     control: the `child` snippet renders a plain div, which keeps the rail
				     geometry coming from the component instead of being re-derived here,
				     and leaves the row out of the tab order. The hover and active fills are
				     cancelled rather than left to imply it is pressable — not with
				     `pointer-events-none`, which would also kill text selection. No
				     tooltipContent either: a rail tooltip explaining a logo is noise.
				     alt="" because the adjacent span already says the name. -->
				<Sidebar.MenuButton
					size="lg"
					class="cursor-default hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent active:text-sidebar-foreground"
				>
					{#snippet child({ props })}
						<div {...props}>
							<img src={asset('/logo.png')} alt="" class="size-8 shrink-0 rounded-lg" />
							<div class="flex min-w-0 flex-col leading-tight">
								<span class="truncate font-medium">Floppy</span>
								<span class="truncate text-xs text-muted-foreground">Peer-to-peer transfer</span>
							</div>
						</div>
					{/snippet}
				</Sidebar.MenuButton>
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

	<!-- Marks the account row as its own region rather than one more destination
	     that happens to sit last. `mx-2` comes from the component; the rail is
	     narrower, so the margin narrows with it or the rule is a stub.
	     The width override is the load-bearing part. sidebar-separator.svelte
	     already asks for `w-auto`, but it never lands: separator.svelte sets
	     `data-[orientation=horizontal]:w-full`, and tailwind-merge treats a
	     different variant prefix as a different scope, so the bare `w-auto` does
	     not replace it (and loses on specificity anyway). The rule was therefore
	     100% of the sidebar *plus* its margins — inset on the left, hanging past
	     the edge on the right. Repeating the prefix makes the merge collapse them,
	     and `w-auto` in this flex column then stretches to the width minus the
	     margins. Fixed here rather than in the vendored component: this is its
	     only consumer, and sidebar.svelte is already patch site enough. -->
	<Sidebar.Separator class="group-data-[collapsible=icon]:mx-1 data-[orientation=horizontal]:w-auto" />

	<!-- Clear the home indicator / gesture bar on mobile (0 on desktop). The
	     drawer sheet uses data-slot="sidebar", so the generic sheet safe-area rule
	     in layout.css doesn't reach it.
	     Additive, and it has to be: a bare `pb-(--safe-bottom)` outranks the
	     component's own `p-2` for the bottom side (tailwind-merge treats the
	     caller's `pb-*` as the more specific of the two), so on desktop, where the
	     inset resolves to 0px, it deleted the 8px instead of adding nothing — and
	     the rail's avatar tile sat flush against the window edge. -->
	<Sidebar.Footer class="pb-[calc(--spacing(2)+var(--safe-bottom))]">
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
