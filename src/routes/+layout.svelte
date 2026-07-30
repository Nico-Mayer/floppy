<script lang="ts">
	import './layout.css'
	import IncomingOfferDialog from '$lib/components/IncomingOfferDialog.svelte'
	import IncomingPairDialog from '$lib/components/IncomingPairDialog.svelte'
	import AppSidebar from '$lib/components/nav/AppSidebar.svelte'
	import TitleBar from '$lib/components/TitleBar.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar'
	import { Toaster } from '$lib/components/ui/sonner'
	import { nav } from '$lib/nav.svelte'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import { afterNavigate } from '$app/navigation'
	import { getCurrentWebview } from '@tauri-apps/api/webview'
	import { ModeWatcher } from 'mode-watcher'
	import { onMount } from 'svelte'

	const { children } = $props()

	// Sidebar open state. Above `lg` there is room for the nav and the content
	// side by side, so we force it open and hide the toggle (see TitleBar); below
	// that it collapses (offcanvas on desktop, a drawer on mobile).
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

	onMount(() => {
		const stopTransfer = app.listen()
		let stopPairing: (() => void) | undefined
		pairing.init().then((stop) => (stopPairing = stop))

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

<Sidebar.Provider bind:open={sidebarOpen} class="h-svh min-h-0! flex-col">
	<TitleBar />
	<div class="flex min-h-0 w-full flex-1">
		<AppSidebar />
		<Sidebar.Inset class="min-h-0 bg-background">
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
