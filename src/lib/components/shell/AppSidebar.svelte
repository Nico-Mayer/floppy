<script lang="ts">
	import { asset, resolve } from '$app/paths'
	import { page } from '$app/state'
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { navItems as items, type NavItem } from '$lib/nav-items'
	import { pairing } from '$lib/pairing-app.svelte'
	import UserIcon from '@lucide/svelte/icons/user'

	// Desktop navigation: a fixed sidebar, collapsible to an icon rail. Mounted
	// only at or above the navigation threshold — below it the bottom bar is the
	// navigation and this never renders. Destinations live in nav-items.ts so there
	// is a single source of truth.
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

	/** The paired-device count, shown on the Devices row once there is one. */
	function showCount(item: NavItem) {
		return item.href === '/devices' && pairing.available && pairing.devices.length > 0
	}
</script>

<!-- Fixed below the titlebar and collapsible to an icon rail. The offset keeps it
     clear of the header, which is sticky above it at every desktop size. -->
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
							<Sidebar.MenuButton isActive={active} tooltipContent={item.label}>
								{#snippet child({ props })}
									<!-- A preview destination says so in its accessible name rather than
									     via an extra element: the row must stay
									     `<a><icon/><span>label</span></a>` with exactly one span, or the
									     component's own icon-rail rules cannot hide the label. -->
									<a
										href={resolve(item.href)}
										{...props}
										aria-label={item.stub ? `${item.label}, preview` : undefined}
									>
										<item.icon />
										<span>{item.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
							<!-- One badge slot per row, so the device count and the preview dot share
							     it rather than stacking on the same corner. No row has both today
							     (Devices is not a preview), but the structure allows it.
							     The badge is pinned by a fixed top offset per row size — `top-1.5` for
							     a default row — which centres a 20px badge on no row we have: it is
							     2px high on the 36px desktop row and 6px high on the 44px touch one.
							     Centring properly is height-agnostic, so it holds for both and for
							     the icon rail. `!` because the component's offset is a variant rule,
							     which an unprefixed `top-1/2` both loses to on specificity and fails
							     to displace in the class merge. -->
							{#if showCount(item) || item.stub}
								<Sidebar.MenuBadge class="top-1/2! -translate-y-1/2 gap-1.5">
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

	<!-- Clear the gesture rail on a desktop OS that reports one (0 almost always).
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
				     It navigates to Settings, where the Account section actually is,
				     rather than opening a dialog: one place the account is presented and
				     one way to reach it. Deliberately no `isActive` — on /settings the
				     destination row above is the one that reads as active, and two rows
				     lighting at once would say this is a second entry in the list.
				     The wording stays limited to syncing devices between installs: the
				     rendezvous broker is accountless and stateless, and nothing here
				     changes that. Status is in text for the same reason there is no
				     account item in the bottom bar: the avatar has no image to fetch, so
				     signed in and signed out would render the same glyph. -->
				<Sidebar.MenuButton size="lg" tooltipContent="Sign in">
					{#snippet child({ props })}
						<a href={resolve('/settings')} {...props}>
							<!-- No avatar image while signed out. A face would misrepresent the
							     empty account, and fetching one from a third party is at odds
							     with the app's peer-to-peer, no-cloud promise, so there is no
							     `src` to fetch: the icon fallback is the whole avatar. -->
							<Avatar.Root class="size-8 rounded-lg">
								<Avatar.Fallback class="rounded-lg"><UserIcon class="size-4" /></Avatar.Fallback>
							</Avatar.Root>
							<div class="flex min-w-0 flex-col leading-tight">
								<span class="truncate font-medium">Not signed in</span>
								<span class="truncate text-xs text-muted-foreground">Sync your devices</span>
							</div>
							<StubMark class="ml-auto" />
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
