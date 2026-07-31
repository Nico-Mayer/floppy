// Pull down from the top of a scroller to reload it.
//
// Vertical, so it never enters the horizontal arbitration in
// `horizontal-swipe.svelte` — the two cannot both claim a touch, because this one
// only starts when the finger is already moving down from a scroll position of
// zero, and that is exactly the case a horizontal gesture releases.
//
// The one rule that matters: the gesture may only begin when the scroller is
// already at the top. Otherwise a pull would fight the scroll it is sitting on,
// which is the usual way this feature goes wrong.

export type PullToRefreshParams = {
	/** Reload. The indicator stays up until this settles. */
	onrefresh: () => void | Promise<void>
	/** Report how far the pull has come, in CSS px, so a caller can draw it. */
	onpull?: (distance: number) => void
	/** Whether a refresh is currently running. */
	onbusy?: (busy: boolean) => void
	/** Off switch — e.g. only on touch devices. */
	enabled?: boolean
}

/** How far the finger must travel before releasing triggers a reload. */
export const PULL_TRIGGER = 64
/** The pull resists past this, so it cannot be dragged arbitrarily far. */
export const PULL_MAX = 96

export function pullToRefresh(node: HTMLElement, params: PullToRefreshParams) {
	let current = params

	let pointerId: number | null = null
	let startY = 0
	let startX = 0
	// null while undecided, then true once this is committed to being a pull.
	let pulling: boolean | null = null
	let busy = false

	function reset() {
		pointerId = null
		pulling = null
		current.onpull?.(0)
	}

	function down(event: PointerEvent) {
		if (!(current.enabled ?? true) || busy) return
		if (pointerId !== null) return
		if (event.pointerType !== 'touch') return
		// The whole gesture hinges on this: only from a resting top.
		if (node.scrollTop > 0) return
		pointerId = event.pointerId
		startY = event.clientY
		startX = event.clientX
		pulling = null
	}

	function move(event: PointerEvent) {
		if (pointerId !== event.pointerId) return
		const dy = event.clientY - startY
		const dx = event.clientX - startX

		if (pulling === null) {
			if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return
			// Downward and mostly vertical, or it belongs to something else.
			pulling = dy > 0 && Math.abs(dy) > Math.abs(dx)
			if (!pulling) {
				reset()
				return
			}
		}

		if (dy <= 0) {
			// Dragged back above the start; treat it as abandoned rather than
			// inverting into a push.
			current.onpull?.(0)
			return
		}

		// Resist past the maximum instead of stopping dead, so the limit is felt.
		const eased = dy <= PULL_MAX ? dy : PULL_MAX + (dy - PULL_MAX) * 0.2
		current.onpull?.(eased)
	}

	async function up(event: PointerEvent) {
		if (pointerId !== event.pointerId) return
		const wasPulling = pulling === true
		const dy = event.clientY - startY
		reset()
		if (!wasPulling || dy < PULL_TRIGGER) return

		busy = true
		current.onbusy?.(true)
		try {
			await current.onrefresh()
		} finally {
			busy = false
			current.onbusy?.(false)
		}
	}

	function cancel(event: PointerEvent) {
		if (pointerId !== event.pointerId) return
		reset()
	}

	// pointerdown on the node (the gesture must start inside the scroller), the
	// rest on the window so the finger may leave it mid-pull.
	node.addEventListener('pointerdown', down, { passive: true })
	window.addEventListener('pointermove', move, { passive: true })
	window.addEventListener('pointerup', up, { passive: true })
	window.addEventListener('pointercancel', cancel, { passive: true })

	return {
		update(next: PullToRefreshParams) {
			current = next
		},
		destroy() {
			node.removeEventListener('pointerdown', down)
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', up)
			window.removeEventListener('pointercancel', cancel)
		}
	}
}
