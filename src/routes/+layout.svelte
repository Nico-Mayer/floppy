<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import ScanSheet from '$lib/components/devices/ScanSheet.svelte'
	import IncomingOfferDialog from '$lib/components/prompts/IncomingOfferDialog.svelte'
	import IncomingPairDialog from '$lib/components/prompts/IncomingPairDialog.svelte'
	import AppHeader from '$lib/components/shell/AppHeader.svelte'
	import AppSidebar from '$lib/components/shell/AppSidebar.svelte'
	import BottomNav from '$lib/components/shell/BottomNav.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { Toaster } from '$lib/components/ui/sonner'
	import { IsMobile } from '$lib/hooks/is-mobile.svelte'
	import { fast, shift } from '$lib/motion'
	import { platformNavItems } from '$lib/nav-items'
	import { pairing } from '$lib/pairing-app.svelte'
	import { isPhoneChrome } from '$lib/platform'
	import { keepFocusVisible } from '$lib/keyboard'
	import { watchSafeArea } from '$lib/safe-area'
	import { app } from '$lib/transfer-app.svelte'
	import { onBackButtonPress } from '@tauri-apps/api/app'
	import type { PluginListener } from '@tauri-apps/api/core'
	import { getCurrentWebview } from '@tauri-apps/api/webview'
	import { getCurrentWindow } from '@tauri-apps/api/window'
	import { ModeWatcher, setMode } from 'mode-watcher'
	import { onMount } from 'svelte'
	import { fly } from 'svelte/transition'
	import './layout.css'

	const { children } = $props()

	// Sidebar open state: starts expanded, and the header's menu button collapses
	// it to an icon rail. Desktop-only by construction — below the navigation
	// threshold the sidebar is not mounted at all.
	let sidebarOpen = $state(true)

	// Which navigation surface renders. The same threshold the sidebar reads
	// internally, instantiated here because the layout sits outside the provider's
	// context. Width-driven, so a narrow desktop window gets the bar too — and
	// that is what makes the sidebar's mobile branch genuinely unreachable.
	const isMobile = new IsMobile()

	// Route changes animate in the direction of travel, derived from position in
	// the destination list rather than from whatever control caused the change —
	// so a bar tap, a sidebar click, ⌘2, and an accepted transfer all move the same
	// way. Only the arriving screen animates: the two would otherwise both be in
	// the flex column at once and the layout would jump.
	// Seeded on first run rather than at declaration: a route outside the list
	// (desktop's /account, reached via the sidebar's account row) leaves the
	// direction as it was.
	let enterDir = $state(1)
	let previousIndex: number | null = null
	$effect(() => {
		const index = platformNavItems.findIndex((item) => item.href === page.url.pathname)
		if (index === -1) return
		if (previousIndex !== null && index !== previousIndex) enterDir = index > previousIndex ? 1 : -1
		previousIndex = index
	})

	// ⌘1-⌘4 (Ctrl elsewhere) over the destination list, in the layout so they work
	// from every route and cannot drift from what the bar and sidebar show.
	function handleShortcuts(e: KeyboardEvent) {
		if (!(e.metaKey || e.ctrlKey)) return
		const slot = Number(e.key)
		if (!Number.isInteger(slot)) return
		const item = platformNavItems[slot - 1]
		if (!item) return
		e.preventDefault()
		void goto(resolve(item.href))
	}

	// Native file drag-drop. OS drops never reach the DOM's drag events (the
	// native window layer takes them first), so Tauri reports enter/over/leave/
	// drop with absolute paths instead — window-wide, with no hit-testing of its
	// own. That last part is ours: a card opts in with [data-file-drop-target]
	// (see TransferCard), and only a drop landing inside one is accepted.
	// Lives in the layout, not a page, so the listeners (and the transfer/pairing
	// event streams below) survive navigation between routes.

	/** The drop target under a drop point, or null if the point missed them all. */
	function targetAt(position: { x: number; y: number }): Element | null {
		const ratio = window.devicePixelRatio || 1
		const el = document.elementFromPoint(position.x / ratio, position.y / ratio)
		return el?.closest('[data-file-drop-target]') ?? null
	}

	/** Tint the hovered target only, so the cursor position means something. */
	function highlightDropTarget(hovered: Element | null) {
		for (const el of document.querySelectorAll('[data-file-drop-target]')) {
			el.classList.toggle('file-drop-target-active', el === hovered)
		}
	}

	// Mobile chrome sizes. Set on <html> because portaled overlays mount on
	// <body>, outside the shell, and still have to clear the bars.
	if (isPhoneChrome && typeof document !== 'undefined') {
		document.documentElement.dataset.mobile = ''
	}

	// A phone follows the system theme, always. There is no theme control on
	// phone chrome (Settings is a desktop destination), so a preference stored
	// by an earlier build would be a choice with no way to change it — reset it
	// rather than leave it winning silently.
	if (isPhoneChrome && typeof document !== 'undefined') {
		setMode('system')
	}

	onMount(() => {
		const stopTransfer = app.listen()
		let stopPairing: (() => void) | undefined
		pairing.init().then((stop) => (stopPairing = stop))

		// Android hands the real window insets to the page; iOS and desktop get
		// them from env() and this is a no-op there.
		const stopSafeArea = watchSafeArea()

		// The keyboard overlays the app rather than resizing it (see app.html), so
		// keeping a focused field above it is ours to do. No-op off a phone build.
		const stopFocusScroll = keepFocusVisible()

		// Android hardware back: registering a handler suppresses the default
		// (which finishes the activity). Navigation is flat — every destination
		// stands on its own, so there is no in-app back to offer. Back only has to
		// dismiss an open overlay; with none open it leaves the app by closing the
		// window, the finish the default would have done. No-op on desktop, where
		// there is no hardware back.
		let backListener: PluginListener | undefined
		if (isPhoneChrome) {
			onBackButtonPress(() => {
				// An open overlay owns the gesture first: back should dismiss it, not
				// quit the app out from under it. Escape is how each layer already
				// closes, so we hand it that — a prompt that refuses to be dismissed
				// still refuses. No navigation surface is listed: navigation is a bar
				// in the layout flow, so there is nothing of its own to close.
				const overlay = document.querySelector(
					'[data-slot="dialog-content"],[data-slot="sheet-content"],[data-slot="drawer-content"]'
				)
				if (overlay) {
					document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
					return
				}
				void getCurrentWindow().close()
			}).then((listener) => (backListener = listener))
		}

		// Suppress the webview's native right-click menu (Cut/Copy/Paste). A
		// file-transfer app has no use for it.
		const noContextMenu = (e: Event) => e.preventDefault()
		document.addEventListener('contextmenu', noContextMenu)

		let stopDrag: (() => void) | undefined
		getCurrentWebview()
			.onDragDropEvent(async (event) => {
				const p = event.payload
				if (p.type === 'enter' || p.type === 'over') {
					highlightDropTarget(targetAt(p.position))
				} else if (p.type === 'leave') {
					highlightDropTarget(null)
				} else if (p.type === 'drop') {
					const target = targetAt(p.position)
					highlightDropTarget(null)
					if (target) await app.send.addPaths(p.paths)
				}
			})
			.then((un) => (stopDrag = un))

		return () => {
			stopTransfer()
			stopPairing?.()
			stopDrag?.()
			stopSafeArea()
			stopFocusScroll()
			void backListener?.unregister()
			document.removeEventListener('contextmenu', noContextMenu)
		}
	})

	// Dev-only escape hatch: lets the browser preview (no Tauri bridge) drive
	// app state from the console to debug UI in isolation.
	if (import.meta.env.DEV) {
		;(window as unknown as Record<string, unknown>).__app = app
	}
</script>

<svelte:window onkeydown={handleShortcuts} />

<ModeWatcher />

<!-- The camera's own chrome. Outside the shell on purpose: while scanning, the
     shell is hidden so the camera behind the webview can be seen, and a sheet
     rendered inside it would go with it. -->
<ScanSheet />

<!-- One shell for every platform and width. The header is platform chrome (macOS
     traffic-light spacer, Windows controls, nothing at all on a phone); width
     picks exactly one navigation surface — the icon-rail sidebar at or above the
     threshold, the bottom bar below it. The bar is a flex sibling rather than a
     fixed overlay, so it takes no z-index and no scroll region has to pad around
     it. Safe-area insets clear the notch, gesture rails and home indicator: the
     content owns the top (there is no app bar to own it), the bar owns the
     bottom. All of them resolve to 0 on desktop. -->
<Sidebar.Provider bind:open={sidebarOpen} class="h-svh min-h-0! flex-col">
	<AppHeader />
	<div class="flex min-h-0 w-full flex-1">
		{#if !isMobile.current}
			<AppSidebar />
		{/if}
		<!-- overflow-clip contains the route transition below. The arriving screen
		     starts translated sideways, which without this pokes out of the inset and
		     the overflow travels all the way up to <body>: a horizontal scrollbar
		     appears for the length of the animation, and the height it steals brings a
		     vertical one with it. Every route either sizes itself to the viewport or
		     brings its own scroller (see PageShell), so there is nothing here that was
		     relying on an ancestor to scroll for it. `clip` rather than `hidden`: no
		     scroll container, so nothing can end up scrolled to a stray offset. -->
		<Sidebar.Inset
			class="min-h-0 overflow-clip bg-background pt-(--safe-top) pr-(--safe-right) pl-(--safe-left)"
		>
			<!-- Keyed so the arriving screen actually mounts and its transition runs.
			     fast()/shift() collapse to 0 under prefers-reduced-motion, which is
			     what turns this back into a plain swap there. -->
			{#key page.url.pathname}
				<div
					class="flex min-h-0 w-full flex-1 flex-col"
					in:fly={{ x: enterDir * shift() * 3, duration: fast() }}
				>
					{@render children()}
				</div>
			{/key}
		</Sidebar.Inset>
	</div>
	{#if isMobile.current}
		<BottomNav />
	{/if}
</Sidebar.Provider>

<!-- Trusted-device incoming prompts and toasts are global: they can arrive on
     any route, so they live in the layout, not a page. -->
<IncomingOfferDialog />
<IncomingPairDialog />

<!-- The offset clears the titlebar: sonner's default 24px lands a toast on the
     window frame (drag region, and on Windows the min/max/close buttons). On
     mobile there is no header to clear, only the status bar, so the mobile offset
     is the top inset rather than --header-height. No richColors: type is carried
     by the icon (see ui/sonner). -->
<Toaster
	position="top-center"
	richColors={true}
	offset={{ top: 'calc(var(--header-height) + var(--spacing) * 2)' }}
	mobileOffset={{ top: 'calc(var(--safe-top) + var(--spacing) * 2)' }}
	closeButton
/>
