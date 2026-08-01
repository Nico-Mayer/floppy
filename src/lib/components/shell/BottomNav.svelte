<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { navItems as items, type NavItem } from '$lib/nav-items'
	import { pairing } from '$lib/pairing-app.svelte'
	import { isPhoneChrome } from '$lib/platform'
	import { app } from '$lib/transfer-app.svelte'
	import { cn } from '$lib/utils'

	// Mobile navigation: the four destinations from nav-items.ts, one tap each.
	//
	// In the layout flow as a sibling of the content region, not `position: fixed`.
	// That is what keeps it out of the z-order argument the header already has with
	// dialogs (header is z-60, dialog content z-50), and it means no scroll region
	// anywhere needs a matching bottom inset to avoid being covered.
	//
	// It owns --safe-bottom, and it is the only surface that does: the content
	// inset gave it up when the bar took over the floor.

	// Exact match — every route is a leaf, so no prefix ambiguity to resolve.
	const pathname = $derived(page.url.pathname)

	// The bar stands down while the soft keyboard is up, and only then.
	//
	// Not a preference: both platforms take the keyboard's height out of the
	// layout the bar sits in — iOS shrinks the web view, Android resizes under
	// edge-to-edge — so an in-flow bar has nowhere to go but up, and ends up
	// riding on top of the keys. Neither platform's own navigation does that. It
	// cannot be *covered* instead, because on iOS the space it would hide in no
	// longer exists.
	//
	// Distinct from the settled decision that the bar never hides for a transfer:
	// that is about state the user might want to leave, this is about a surface
	// physically occupying the bar's room. It returns the moment the field blurs.
	//
	// Gated on form factor, not pointer type: a touchscreen laptop has a hardware
	// keyboard, so nothing eats the viewport there and the bar should stay.
	let typing = $state(false)

	/** Does focusing this open a keyboard? Everything the app focuses is text. */
	function isTextEntry(node: Element | null): boolean {
		if (!(node instanceof HTMLElement)) return false
		return node.isContentEditable || node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'
	}

	function syncTyping() {
		typing = isPhoneChrome && isTextEntry(document.activeElement)
	}

	// focusout fires *before* the next element takes focus, so activeElement is
	// briefly <body> — reading it a frame later is what stops the bar flickering
	// back in when focus moves straight from one field to the next.
	function onFocusOut() {
		requestAnimationFrame(syncTyping)
	}

	/** The paired-device count, shown on the Devices item once there is one. */
	function count(item: NavItem): number | null {
		if (item.href !== '/devices') return null
		if (!pairing.available || pairing.devices.length === 0) return null
		return pairing.devices.length
	}

	/**
	 * Whether this destination holds a transfer worth pointing at. The bar is on
	 * every route, so this is how a failure or a running transfer stays visible
	 * from wherever the user happens to be — the mode switcher's spinner was only
	 * ever visible if you were already looking at the transfer screen.
	 */
	function transfer(item: NavItem): 'failed' | 'running' | null {
		const side = item.href === '/send' ? app.send : item.href === '/receive' ? app.receive : null
		if (!side) return null
		if (side.error) return 'failed'
		return side.busy ? 'running' : null
	}
</script>

<svelte:window onfocusin={syncTyping} onfocusout={onFocusOut} />

<!-- Out of the tree while typing rather than `hidden`: Tailwind's preflight hides
     [hidden] through a zero-specificity `:where()`, which the `flex` utility here
     would win against — and leaving the element in place would keep its height in
     the column anyway, which is the whole problem. -->
{#if !typing}
	<!-- shrink-0 so the content above it does the shrinking; the padding is additive
	     (--safe-bottom is 0 on desktop and in a narrow desktop window, and the bar
	     keeps its normal gap there rather than losing it). -->
	<nav
		aria-label="Main"
		class="flex shrink-0 items-stretch border-t bg-background pt-1 pr-(--safe-right) pb-[calc(--spacing(0)+var(--safe-bottom))] pl-(--safe-left)"
	>
		{#each items as item (item.href)}
			{@const active = pathname === item.href}
			{@const n = count(item)}
			{@const state = transfer(item)}
			<!-- min-h-14 is the 44px minimum with room to spare: at exactly 44 the icon,
		     the label and their gap fill the slot edge to edge and the row reads as
		     packed rather than laid out. Four slots share the width evenly, so each
		     one grows with the screen.
		     A preview destination says so in its accessible name as well as with the
		     marker, the same way the sidebar row does. -->
			<a
				href={resolve(item.href)}
				aria-current={active ? 'page' : undefined}
				aria-label={item.stub ? `${item.label}, preview` : undefined}
				class={cn(
					'flex min-h-14 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2 transition-colors',
					active ? 'text-foreground' : 'text-muted-foreground'
				)}
			>
				<span class="relative flex">
					<item.icon class={cn('size-5', active && 'stroke-[2.25]')} />
					<!-- One indicator cluster per item rather than a corner each, so a count,
				     a preview marker and a transfer dot can all be present without
				     landing on top of one another. Sits above the icon's top-right and
				     is aria-hidden throughout: the count is not the item's name, and the
				     preview state is already in the accessible name above. -->
					{#if n !== null || item.stub || state}
						<span
							class="absolute -top-1.5 left-full flex -translate-x-1 items-center gap-1"
							aria-hidden="true"
						>
							{#if state}
								<span
									class={cn(
										'size-1.5 rounded-full',
										state === 'failed' ? 'bg-destructive' : 'animate-pulse bg-foreground'
									)}
								></span>
							{/if}
							{#if n !== null}
								<span
									class="min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-medium text-primary-foreground"
								>
									{n}
								</span>
							{/if}
							{#if item.stub}
								<span class="size-1.5 rounded-full bg-muted-foreground"></span>
							{/if}
						</span>
					{/if}
				</span>
				<span class="text-xs leading-none font-medium">{item.label}</span>
			</a>
		{/each}
	</nav>
{/if}
