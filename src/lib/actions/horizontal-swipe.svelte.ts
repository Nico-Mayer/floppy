// One horizontal-swipe engine for the whole app, and one fixed order deciding
// which gesture owns a touch.
//
// Only `SwipeRow` uses it today — the navigation drawer's edge-open and the
// Send/Receive pager are both gone, navigation being a bottom bar with no
// gesture of its own. The engine stays the single definition of the order
// anyway, so the next horizontal gesture declares what it refuses through
// `claim` rather than registering a competing set of listeners and letting
// mount order decide the winner.
//
// The order, evaluated on pointerdown and again over the first few pixels:
//
//   1. not a touch pointer          -> ignore. mice do not drag.
//   2. `claim` says no              -> ignore. nothing refuses anything today:
//                                      no region of the screen is reserved.
//   3. vertical travel wins         -> release to scrolling, permanently for
//                                      this touch.
//   4. otherwise                    -> ours; follow the finger until release,
//                                      then commit on distance or velocity.
//
// Rule 3 is the one that makes a row swipe safe inside a scrollable list, and
// "permanently" is load-bearing: re-claiming a touch after it has been released
// to scrolling is what makes a gesture feel like it is fighting you.

export type HorizontalSwipeParams = {
	/**
	 * Refuse a touch outright. Returning false means this gesture never looks at
	 * it again, so another one can have it. Called on pointerdown.
	 */
	claim?: (event: PointerEvent) => boolean
	/** Called as the finger moves, with the horizontal distance travelled. */
	onProgress?: (dx: number) => void
	/** The gesture committed. `-1` is a drag left, `1` a drag right. */
	onCommit?: (direction: -1 | 1) => void
	/** The gesture was abandoned and should animate back to rest. */
	onCancel?: () => void
	/** Fraction of the node's width that counts as a commit. */
	threshold?: number
	/**
	 * Absolute commit distance in CSS px, used instead of `threshold`.
	 *
	 * For a gesture whose node has no size of its own to measure against, or one
	 * that is about the finger travelling a fixed distance rather than crossing a
	 * share of a surface.
	 */
	distance?: number
	/** Release speed that commits regardless of distance, in px/ms. */
	velocity?: number
	/**
	 * Commit the moment the distance is crossed, without waiting for the finger to
	 * lift.
	 *
	 * For a gesture whose result cannot follow the finger anyway, so waiting for
	 * release is pure latency — a surface that snaps rather than sliding with the
	 * drag. A gesture that *does* track the finger must leave this off, or it would
	 * commit while the user can still change their mind by dragging back.
	 */
	commitOnCross?: boolean
	/**
	 * Where `pointerdown` is listened for. `node` claims only gestures starting
	 * inside the element, which is what a swipeable row wants. `window` claims them
	 * anywhere, for a gesture anchored to the screen rather than to a box.
	 */
	surface?: 'node' | 'window'
	/** Off switch, e.g. only on touch devices. */
	enabled?: boolean
}

/** Movement before the axis is decided. Below this, intent is still ambiguous. */
const DIRECTION_LOCK = 10

export function horizontalSwipe(node: HTMLElement, params: HorizontalSwipeParams) {
	let current = params

	let pointerId: number | null = null
	let startX = 0
	let startY = 0
	let startTime = 0
	// null while the axis is undecided, then fixed for the rest of the touch.
	let horizontal: boolean | null = null
	let lastX = 0
	let lastTime = 0

	const on = () => current.enabled ?? true
	const threshold = () => current.threshold ?? 0.25
	const velocity = () => current.velocity ?? 0.5

	function reset() {
		pointerId = null
		horizontal = null
	}

	function down(event: PointerEvent) {
		if (!on()) return
		if (pointerId !== null) return
		if (event.pointerType !== 'touch') return
		if (current.claim && !current.claim(event)) return

		pointerId = event.pointerId
		startX = lastX = event.clientX
		startY = event.clientY
		startTime = lastTime = event.timeStamp
		horizontal = null
	}

	function move(event: PointerEvent) {
		if (pointerId !== event.pointerId) return

		const dx = event.clientX - startX
		const dy = event.clientY - startY

		if (horizontal === null) {
			// Still ambiguous — wait rather than guess from a stray pixel.
			if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) return
			horizontal = Math.abs(dx) > Math.abs(dy)
			if (!horizontal) {
				// Vertical intent. Hand the touch back to the scroller and do not take
				// it again, however the finger turns from here.
				reset()
				return
			}
		}

		// Only measure speed over the recent part of the drag: a slow start
		// followed by a flick should read as a flick.
		if (event.timeStamp !== lastTime) {
			lastX = event.clientX
			lastTime = event.timeStamp
		}
		current.onProgress?.(dx)

		// Snap gestures fire here rather than on release, and end the touch so a
		// finger still travelling cannot commit twice.
		if (current.commitOnCross && crossed(dx)) {
			reset()
			current.onCommit?.(dx < 0 ? -1 : 1)
		}
	}

	/** Has the drag travelled far enough to count, by whichever measure applies? */
	function crossed(dx: number): boolean {
		const absolute = current.distance
		if (absolute !== undefined) return Math.abs(dx) >= absolute
		const width = node.getBoundingClientRect().width
		// Guard a zero width, or a sizeless node would make every pixel a commit.
		return width > 0 && Math.abs(dx) / width >= threshold()
	}

	function up(event: PointerEvent) {
		if (pointerId !== event.pointerId) return
		const wasHorizontal = horizontal === true
		const dx = event.clientX - startX
		reset()

		if (!wasHorizontal) return

		const elapsed = Math.max(event.timeStamp - lastTime, 1)
		const speed = Math.abs(event.clientX - lastX) / elapsed
		// Fall back to the whole-gesture speed when the last sample is stale, so a
		// quick flick that produced one move event still counts.
		const overall = Math.abs(dx) / Math.max(event.timeStamp - startTime, 1)

		const farEnough = crossed(dx)
		const fastEnough = Math.max(speed, overall) >= velocity()

		if (dx !== 0 && (farEnough || fastEnough)) current.onCommit?.(dx < 0 ? -1 : 1)
		else current.onCancel?.()
	}

	function cancel(event: PointerEvent) {
		if (pointerId !== event.pointerId) return
		const wasHorizontal = horizontal === true
		reset()
		if (wasHorizontal) current.onCancel?.()
	}

	// Move and release always come from the window: a drag that starts in the node
	// routinely continues outside it, and a node-scoped pointermove would stop
	// tracking the moment the finger left. Only `pointerdown` is scoped, and that
	// is what `surface` chooses.
	const start: HTMLElement | Window = params.surface === 'window' ? window : node

	start.addEventListener('pointerdown', down as EventListener, { passive: true })
	window.addEventListener('pointermove', move, { passive: true })
	window.addEventListener('pointerup', up, { passive: true })
	window.addEventListener('pointercancel', cancel, { passive: true })

	return {
		update(next: HorizontalSwipeParams) {
			current = next
		},
		destroy() {
			start.removeEventListener('pointerdown', down as EventListener)
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', up)
			window.removeEventListener('pointercancel', cancel)
		}
	}
}
