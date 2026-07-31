<script lang="ts">
	import './layout.css'
	import IncomingOfferDialog from '$lib/components/prompts/IncomingOfferDialog.svelte'
	import IncomingPairDialog from '$lib/components/prompts/IncomingPairDialog.svelte'
	import AppHeader from '$lib/components/shell/AppHeader.svelte'
	import AppSidebar from '$lib/components/shell/AppSidebar.svelte'
	import NavEdgeSwipe from '$lib/components/shell/NavEdgeSwipe.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { Toaster } from '$lib/components/ui/sonner'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import { isMobile } from '$lib/platform'
	import { watchSafeArea } from '$lib/safe-area'
	import { onBackButtonPress } from '@tauri-apps/api/app'
	import { getCurrentWebview } from '@tauri-apps/api/webview'
	import { getCurrentWindow } from '@tauri-apps/api/window'
	import { ModeWatcher } from 'mode-watcher'
	import { onMount } from 'svelte'
	import type { PluginListener } from '@tauri-apps/api/core'

	const { children } = $props()

	// Sidebar open state on desktop: starts expanded, and the header's menu button
	// collapses it to an icon rail. On a phone the sidebar is a drawer and tracks
	// its own `openMobile` state instead, so this only drives desktop.
	let sidebarOpen = $state(true)

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
		// (which finishes the activity). Navigation is flat — every destination
		// stands on its own, so there is no in-app back to offer. Back only has to
		// dismiss an open overlay (a dialog, or the nav drawer); with none open it
		// leaves the app by closing the window, the finish the default would have
		// done. No-op on desktop, where there is no hardware back.
		let backListener: PluginListener | undefined
		if (isMobile) {
			onBackButtonPress(() => {
				// An open dialog or the nav drawer owns the gesture first: back should
				// dismiss it, not quit the app out from under it. Escape is how each
				// layer already closes, so we hand it that — a prompt that refuses to
				// be dismissed still refuses.
				const overlay = document.querySelector(
					'[data-slot="dialog-content"],[data-slot="sheet-content"],[data-slot="drawer-content"],[data-slot="sidebar"][data-mobile="true"]'
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

<ModeWatcher />

<!-- One shell for every platform and width. The header adapts its chrome to the
     platform (macOS traffic-light spacer, Windows controls, or a phone's
     status-bar-safe app bar); the sidebar adapts to the width (a fixed icon rail
     on desktop, a Sheet drawer on a phone, opened by the menu button or a
     left-edge swipe via NavEdgeSwipe). Safe-area insets on the content clear the
     notch, gesture rails and home indicator; they resolve to 0 on desktop. -->
<Sidebar.Provider bind:open={sidebarOpen} class="h-svh min-h-0! flex-col">
	<AppHeader />
	<NavEdgeSwipe />
	<div class="flex min-h-0 w-full flex-1">
		<AppSidebar />
		<Sidebar.Inset class="min-h-0 bg-background pr-(--safe-right) pb-(--safe-bottom) pl-(--safe-left)">
			{@render children()}
		</Sidebar.Inset>
	</div>
</Sidebar.Provider>

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
