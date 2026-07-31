// Left-edge swipe to open the navigation drawer, the way iOS and Android apps
// reveal a side menu. Listeners live on `window`, not the node — the gesture can
// start anywhere in the left strip, and a node-scoped listener would miss it. The
// node is only the action's lifecycle anchor. It only ever *opens*; closing stays
// with the sheet's scrim / a nav choice / the back gesture.

export type EdgeSwipeParams = {
	/** Open the drawer. Called once when the gesture is recognised. */
	onOpen: () => void
	/** Off switch — e.g. only on mobile devices. */
	enabled?: boolean
	/** How close to the left edge a touch must start (CSS px). */
	edge?: number
	/** How far it must travel inward before it counts as an open (CSS px). */
	threshold?: number
}

export function edgeSwipe(_node: HTMLElement, params: EdgeSwipeParams) {
	let current = params
	let startX = 0
	let startY = 0
	let tracking = false

	function down(e: PointerEvent) {
		if (!(current.enabled ?? true)) return
		if (e.pointerType !== 'touch') return
		if (e.clientX > (current.edge ?? 24)) return
		startX = e.clientX
		startY = e.clientY
		tracking = true
	}

	function move(e: PointerEvent) {
		if (!tracking) return
		const dx = e.clientX - startX
		const dy = e.clientY - startY
		// A mostly-horizontal pull past the threshold is the open gesture.
		if (dx > (current.threshold ?? 40) && dx > Math.abs(dy)) {
			tracking = false
			current.onOpen()
		} else if (Math.abs(dy) > 40) {
			// Vertical intent — it's a scroll, not a drawer pull. Bail out.
			tracking = false
		}
	}

	function end() {
		tracking = false
	}

	window.addEventListener('pointerdown', down, { passive: true })
	window.addEventListener('pointermove', move, { passive: true })
	window.addEventListener('pointerup', end, { passive: true })
	window.addEventListener('pointercancel', end, { passive: true })

	return {
		update(next: EdgeSwipeParams) {
			current = next
		},
		destroy() {
			window.removeEventListener('pointerdown', down)
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', end)
			window.removeEventListener('pointercancel', end)
		}
	}
}
