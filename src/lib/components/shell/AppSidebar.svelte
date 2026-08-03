<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { platformNavItems as items, type NavItem } from '$lib/nav-items'
	import { pairing } from '$lib/pairing-app.svelte'
	import UserIcon from '@lucide/svelte/icons/user'

	// Desktop navigation: a fixed sidebar, collapsible to an icon rail. Mounted
	// only at or above the navigation threshold — below it the bottom bar is the
	// navigation and this never renders. Destinations live in nav-items.ts so there
	// is a single source of truth.
	//
	// Structure follows the shadcn-svelte sidebar contract so the icon rail renders
	// correctly: brand and account rows are `size="lg"` menu buttons, and each nav
	// row is `<a><icon/><span>label</span></a>` — one span, so the component's own
	// `group-data-[collapsible=icon]` rules hide the label and centre the icon. No
	// custom heights fight that.
	//
	// The rail geometry all lives in the component (a `size-12` tile, contents after
	// the leading glyph hidden, that glyph centred), so `size="lg"` here is only the
	// taller expanded row for a two-line label plus a size-10 mark. It is no longer
	// load-bearing for the rail: a row may carry a 16px icon or a 40px avatar and
	// still centre. Only the leading child survives the collapse, which is why the
	// two label lines are wrapped in one div and the preview badge trails them.

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
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Menu</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each items as item (item.href)}
						{@const active = pathname === item.href}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={active}>
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
							     a default row — which centres a 20px badge on no row we have: it sits
							     8px high on the 48px desktop row. Centring properly is height-agnostic,
							     so it survives the row scale changing and the icon rail. `!` because the component's offset is a variant rule,
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
	     that happens to sit last. The component's `mx-2` is kept at both widths: it
	     is the same 8px the header, group, and footer pad by, so the rule ends
	     exactly where a rail tile does and where an expanded row does.
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
	<Sidebar.Separator class="data-[orientation=horizontal]:w-auto" />

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
				     It navigates to the Account screen rather than opening a dialog: one
				     place the account is presented and one way to reach it per platform
				     (phones reach it as a bar destination instead). Deliberately no
				     `isActive` — /account is not in the desktop destination list, and an
				     account affordance that happens to navigate should not read as a
				     fifth entry.
				     The wording stays limited to syncing devices between installs: the
				     rendezvous broker is accountless and stateless, and nothing here
				     changes that. Status is in text: the avatar has no image to fetch,
				     so signed in and signed out would render the same glyph. -->
				<Sidebar.MenuButton size="lg" tooltipContent="Sign in">
					{#snippet child({ props })}
						<a href={resolve('/account')} {...props}>
							<!-- No avatar image while signed out. A face would misrepresent the
							     empty account, and fetching one from a third party is at odds
							     with the app's peer-to-peer, no-cloud promise, so there is no
							     `src` to fetch: the icon fallback is the whole avatar. -->
							<UserIcon class="size-5" />

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
