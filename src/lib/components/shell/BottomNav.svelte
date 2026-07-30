<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { nav } from '$lib/nav.svelte'
	import { navItems, type NavItem } from '$lib/nav-items'
	import { pairing } from '$lib/pairing-app.svelte'
	import { cn } from '$lib/utils'

	// Mobile's primary navigation, shaped like the platform's own: a UITabBar /
	// SwiftUI TabView. Four top-level destinations belong on a bar you can always
	// see and reach with a thumb, not behind a drawer — a drawer is for the
	// overflow, and hiding the whole map of the app in one is what made back feel
	// wrong (close the drawer, navigate, press back, land somewhere unrelated).
	//
	// The look is deliberately plain: no indicator pill, no ripple, no chrome of
	// its own. A translucent bar, a hairline, and the current tab simply being
	// the one that isn't dimmed. That is what both iOS and Instagram do, and it
	// leaves the app's own colour to the content.
	//
	// Switching tabs *replaces* the history entry instead of pushing one, so back
	// never walks you backwards through tabs you visited. From a top-level
	// destination, back leaves the app — which is what Android users expect.
	const pathname = $derived(page.url.pathname)

	async function switchTo(href: NavItem['href']) {
		if (pathname === href) return
		await goto(resolve(href), { replaceState: true })
		nav.reset()
	}
</script>

<!-- Fixed, and the routes pad their own scrollers by --bottom-nav-height, so
     content passes under the bar rather than stopping short of it. That is what
     the blur is for. It pads itself by the bottom inset, so its background
     covers the gesture bar instead of content hiding behind it. -->
<nav
	aria-label="Main"
	class="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/72 pr-(--safe-right) pb-(--safe-bottom) pl-(--safe-left) backdrop-blur-2xl backdrop-saturate-150"
>
	<div class="flex h-(--bottom-nav-height) items-stretch">
		{#each navItems as item (item.href)}
			{@const active = pathname === item.href}
			<a
				href={resolve(item.href)}
				aria-current={active ? 'page' : undefined}
				onclick={(e) => {
					e.preventDefault()
					void switchTo(item.href)
				}}
				class={cn(
					// active:opacity is the platform's press feedback — a quick dim, not
					// a ripple and not a colour change.
					'flex flex-1 flex-col items-center justify-center gap-1 transition-opacity duration-100 active:opacity-50',
					active ? 'text-foreground' : 'text-muted-foreground'
				)}
			>
				<span class="relative">
					<!-- Lucide has no filled variants, so the active icon thickens
					     instead. It reads the same way an SF Symbol .fill does. -->
					<item.icon class="size-6" strokeWidth={active ? 2.4 : 1.75} />
					{#if item.href === '/devices' && pairing.available && pairing.devices.length > 0}
						<span
							class="absolute -top-1 -right-2 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground"
						>
							{pairing.devices.length}
						</span>
					{/if}
				</span>
				<span class="text-[10px] leading-none font-medium tracking-tight">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
