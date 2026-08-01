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
//
// Touch events rather than pointer events, and one of them deliberately not
// passive. This started as passive `pointerdown`/`pointermove`, and fired perhaps
// one pull in three: at a scroll position of zero a downward drag rubber-bands the
// scroller, and once iOS has begun that it cancels the pointer sequence, so the
// release that would have triggered the reload never arrived. `preventDefault` is
// the only way to stop the rubber-band, it must happen on the *first* move of the
// gesture (iOS ignores it once scrolling has started), and a passive listener is
// not allowed to call it. Touch events also carry implicit capture — the sequence
// keeps going to the element it started on — so the finger may leave the scroller
// without window-level listeners.

export type PullToRefreshParams = {
	/** Reload. The indicator stays up until this settles, and briefly after. */
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

/**
 * Shortest time the busy state is held.
 *
 * A local reload can finish inside a single frame — reading the trust store is a
 * few milliseconds — so without a floor the indicator is raised and dropped
 * before it has painted once, and a deliberate gesture appears to do nothing at
 * all. The data is already in place behind it; this only delays saying so.
 */
const MIN_BUSY = 450

/** Movement before the axis is decided. Below this, intent is still ambiguous. */
const DIRECTION_LOCK = 8

export function pullToRefresh(node: HTMLElement, params: PullToRefreshParams) {
	let current = params

	let touchId: number | null = null
	let startY = 0
	let startX = 0
	// null while undecided, then true once this is committed to being a pull.
	let pulling: boolean | null = null
	let busy = false

	function reset() {
		touchId = null
		pulling = null
		current.onpull?.(0)
	}

	/** This gesture's touch, out of however many are on the glass. */
	function find(touches: TouchList): Touch | undefined {
		if (touchId === null) return undefined
		for (let i = 0; i < touches.length; i++) {
			if (touches[i].identifier === touchId) return touches[i]
		}
		return undefined
	}

	function start(event: TouchEvent) {
		if (!(current.enabled ?? true) || busy) return
		if (touchId !== null) return
		// One finger. A pinch or a second finger is not a pull.
		if (event.touches.length !== 1) return
		// The whole gesture hinges on this: only from a resting top.
		if (node.scrollTop > 0) return
		const touch = event.touches[0]
		touchId = touch.identifier
		startY = touch.clientY
		startX = touch.clientX
		pulling = null
	}

	function move(event: TouchEvent) {
		const touch = find(event.touches)
		if (!touch) return
		const dy = touch.clientY - startY
		const dx = touch.clientX - startX

		// Claimed before the axis is even decided, and that ordering is the fix: at a
		// scroll position of zero a downward drag cannot scroll anything, it can only
		// rubber-band, so taking it costs no legitimate scrolling — and by the time
		// the direction lock resolves it is already too late to refuse the bounce.
		// An upward drag is left alone and scrolls normally.
		if (dy > 0 && event.cancelable) event.preventDefault()

		if (pulling === null) {
			if (Math.abs(dy) < DIRECTION_LOCK && Math.abs(dx) < DIRECTION_LOCK) return
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

	async function end(event: TouchEvent) {
		const touch = find(event.changedTouches)
		if (!touch) return
		const wasPulling = pulling === true
		const dy = touch.clientY - startY
		reset()
		if (!wasPulling || dy < PULL_TRIGGER) return

		busy = true
		current.onbusy?.(true)
		const started = Date.now()
		try {
			await current.onrefresh()
		} finally {
			const remaining = MIN_BUSY - (Date.now() - started)
			if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining))
			busy = false
			current.onbusy?.(false)
		}
	}

	function cancel(event: TouchEvent) {
		if (find(event.changedTouches)) reset()
	}

	// All four on the node: a touch sequence keeps being delivered to the element it
	// began on, so nothing is missed when the finger travels outside the scroller.
	node.addEventListener('touchstart', start, { passive: true })
	node.addEventListener('touchmove', move, { passive: false })
	node.addEventListener('touchend', end, { passive: true })
	node.addEventListener('touchcancel', cancel, { passive: true })

	return {
		update(next: PullToRefreshParams) {
			current = next
		},
		destroy() {
			node.removeEventListener('touchstart', start)
			node.removeEventListener('touchmove', move)
			node.removeEventListener('touchend', end)
			node.removeEventListener('touchcancel', cancel)
		}
	}
}
