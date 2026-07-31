// Left-edge swipe to open the navigation drawer, the way iOS and Android apps
// reveal a side menu.
//
// A thin wrapper over `horizontalSwipe`, which owns the tracking and the
// arbitration order. What is specific to this gesture is only which touches it
// claims: the reserved left strip, and rightward travel. It still only ever
// *opens* — closing belongs to the drawer, which drags shut, plus the scrim, a
// nav choice, and the back gesture.
//
// Listening on the window rather than the node is required, not a preference:
// the node this hangs off is hidden and has no hit area, and the gesture is
// anchored to the screen edge anyway.
//
// Opening is deliberately a snap rather than a finger-tracked reveal: vaul's
// drag handling only exists while the drawer is already open, so there is no way
// to hand it an in-flight opening drag without reaching into its internals.

import { EDGE_STRIP, horizontalSwipe } from './horizontal-swipe.svelte'

export type EdgeSwipeParams = {
	/** Open the drawer. Called once when the gesture is recognised. */
	onOpen: () => void
	/** Off switch — e.g. only on touch devices. */
	enabled?: boolean
	/** How close to the left edge a touch must start (CSS px). */
	edge?: number
	/** How far it must travel inward before it counts as an open (CSS px). */
	threshold?: number
}

export function edgeSwipe(node: HTMLElement, params: EdgeSwipeParams) {
	let current = params

	// Getters throughout, reading the `current` the wrapper reassigns, so the
	// inner action never needs re-configuring: one live params object.
	const swipe = horizontalSwipe(node, {
		surface: 'window',
		// The drawer snaps open, so waiting for the finger to lift would be pure
		// latency: it opens the moment the pull is far enough, as it did before.
		commitOnCross: true,
		claim: (event) => event.clientX <= (current.edge ?? EDGE_STRIP),
		// Inward only. A leftward drag that happens to start at the left edge is
		// not an open.
		onCommit: (direction) => {
			if (direction === 1) current.onOpen()
		},
		get distance() {
			return current.threshold ?? 40
		},
		get enabled() {
			return current.enabled ?? true
		}
	})

	return {
		update(next: EdgeSwipeParams) {
			current = next
		},
		destroy: swipe.destroy
	}
}
