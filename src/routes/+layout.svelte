<script lang="ts">
	import './layout.css'
	import IncomingOfferDialog from '$lib/components/prompts/IncomingOfferDialog.svelte'
	import IncomingPairDialog from '$lib/components/prompts/IncomingPairDialog.svelte'
	import AppSidebar from '$lib/components/shell/AppSidebar.svelte'
	import BottomNav from '$lib/components/shell/BottomNav.svelte'
	import TopAppBar from '$lib/components/shell/TopAppBar.svelte'
	import WindowChrome from '$lib/components/shell/WindowChrome.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { Toaster } from '$lib/components/ui/sonner'
	import { nav } from '$lib/nav.svelte'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import { isMobile } from '$lib/platform'
	import { watchSafeArea } from '$lib/safe-area'
	import { afterNavigate } from '$app/navigation'
	import { onBackButtonPress } from '@tauri-apps/api/app'
	import { getCurrentWebview } from '@tauri-apps/api/webview'
	import { getCurrentWindow } from '@tauri-apps/api/window'
	import { ModeWatcher } from 'mode-watcher'
	import { onMount } from 'svelte'
	import type { PluginListener } from '@tauri-apps/api/core'

	const { children } = $props()

	// Sidebar open state (desktop only). Above `lg` there is room for the nav and
	// the content side by side, so we force it open and hide the toggle (see
	// WindowChrome); below that it collapses to offcanvas.
	let sidebarOpen = $state(true)

	// Track the history depth so the titlebar can offer a back control.
	afterNavigate((n) => nav.record(n.type))

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
	if (isMobile && typeof document !== 'undefined') {
		document.documentElement.dataset.mobile = ''
	}

	onMount(() => {
		const stopTransfer = app.listen()
		let stopPairing: (() => void) | undefined
		pairing.init().then((stop) => (stopPairing = stop))

		// Android hands the real window insets to the page; iOS and desktop get
		// them from env() and this is a no-op there.
		const stopSafeArea = watchSafeArea()

		// Android hardware back: registering a handler suppresses the default
		// (which finishes the activity), so we route it to in-app navigation.
		// At the root of the history stack there is nothing to pop, so we let the
		// app leave by closing the window — the finish the default would have
		// done. No-op on desktop, where there is no hardware back.
		let backListener: PluginListener | undefined
		if (isMobile) {
			onBackButtonPress(() => {
				// An open dialog, sheet or drawer owns the gesture first: back should
				// dismiss it, not navigate out from under it (or, at the root, quit
				// the app mid-prompt). Escape is how each layer already closes, so we
				// hand it that — a prompt that refuses to be dismissed still refuses.
				const overlay = document.querySelector(
					'[data-slot="dialog-content"],[data-slot="sheet-content"],[data-slot="drawer-content"]'
				)
				if (overlay) {
					document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
					return
				}
				if (nav.canGoBack) nav.back()
				else void getCurrentWindow().close()
			}).then((listener) => (backListener = listener))
		}

		// Force the sidebar open at lg+ (Tailwind's 1024px), and re-force it if the
		// window grows past the breakpoint after being collapsed.
		const wide = window.matchMedia('(min-width: 1024px)')
		const applyWide = () => wide.matches && (sidebarOpen = true)
		applyWide()
		wide.addEventListener('change', applyWide)

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
			void backListener?.unregister()
			wide.removeEventListener('change', applyWide)
			document.removeEventListener('contextmenu', noContextMenu)
		}
	})

	// Dev-only escape hatch: lets the browser preview (no Tauri bridge) drive
	// app state from the console to debug UI in isolation.
	if (import.meta.env.DEV) {
		;(window as unknown as Record<string, unknown>).__app = app
	}
</script>

<ModeWatcher />

<!-- Two shells, picked by platform rather than by width: a narrow desktop window
     still has a titlebar and a mouse, and a phone never does. Mobile gets the
     native pattern (app bar on top, tab bar on the bottom, no drawer); desktop
     keeps the sidebar. -->
{#if isMobile}
	<div class="flex h-svh min-h-0 flex-col bg-background">
		<TopAppBar />
		<!-- The bottom bar is fixed, so the content pads itself out from under it.
		     Left/right insets cover the notch and the gesture rails in landscape. -->
		<!-- flex-col, like Sidebar.Inset on desktop: the routes lay themselves out
		     as flex children of it. Clearing the tab bar is left to each route, so
		     a scrolling one can pass its content *under* the translucent bar
		     instead of stopping short of it. -->
		<div class="flex min-h-0 w-full flex-1 flex-col pr-(--safe-right) pl-(--safe-left)">
			{@render children()}
		</div>
		<BottomNav />
	</div>
{:else}
	<Sidebar.Provider bind:open={sidebarOpen} class="h-svh min-h-0! flex-col">
		<WindowChrome />
		<div class="flex min-h-0 w-full flex-1">
			<AppSidebar />
			<Sidebar.Inset class="min-h-0 bg-background">
				{@render children()}
			</Sidebar.Inset>
		</div>
	</Sidebar.Provider>
{/if}

<!-- Trusted-device incoming prompts and toasts are global: they can arrive on
     any route, so they live in the layout, not a page. -->
<IncomingOfferDialog />
<IncomingPairDialog />

<!-- The offset clears the titlebar: sonner's default 24px lands a toast on the
     window frame (drag region, and on Windows the min/max/close buttons). No
     richColors: type is carried by the icon (see ui/sonner). -->
<Toaster
	position="top-center"
	offset={{ top: 'calc(var(--header-height) + var(--spacing) * 2)' }}
	mobileOffset={{ top: 'calc(var(--header-height) + var(--spacing) * 2)' }}
	closeButton
/>
