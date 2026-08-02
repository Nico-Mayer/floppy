// The Send screen's one "add files" entry point, and the state of the sheet it
// opens on a phone.
//
// Three surfaces ask for files while the queue is editable — the empty state,
// the dashed tile at the end of the grid, and the floating button — and on a
// phone all three have to offer the same two choices. They route through this
// module so that is structural rather than a convention: one `open` flag, one
// `start()`, and no way for a fourth caller to grow a drawer of its own.
//
// The platform branch lives here too, and it is `isPhoneChrome` rather than
// `isTouch()`: the sheet exists because the OS has a photo library and no
// drag-and-drop, which is a property of the platform and not of the pointer. A
// touchscreen laptop keeps the direct picker.

import { isPhoneChrome } from '$lib/platform'
import { app } from '$lib/transfer-app.svelte'

class AddFiles {
	/** Whether the sheet is showing. Only ever true on a phone build. */
	open = $state(false)

	/** Queued until the sheet has finished leaving. See after(). */
	#next: (() => void) | null = null

	/** Ask for files: the sheet on a phone, the file picker everywhere else. */
	start() {
		// One guard for all three surfaces, here rather than repeated on each of
		// them, for the same reason the branch below lives here. It cannot live in
		// transfer-app instead: its own re-entry check refuses a second *pick*, and
		// on a phone this opens the drawer, which that check never sees.
		//
		// The wait it guards is a real one — a big photo selection takes seconds to
		// come back (see `picking`) — and it is the action zone that says so, so a
		// surface that quietly does nothing here has already been explained.
		if (app.send.picking) return
		if (isPhoneChrome) this.open = true
		else void app.send.pickFiles()
	}

	/**
	 * Run `next` once the sheet has finished animating out.
	 *
	 * The native picker is opened from here rather than straight from the row's
	 * click handler so the drawer is gone before the OS puts its own surface up,
	 * instead of the two being stacked.
	 *
	 * Closing is not this function's job: the row is a Drawer.Close, because vaul
	 * only runs its close path — and so only reports the animation end — when the
	 * close comes from the primitive. Writing `open = false` here would slide the
	 * sheet away and then never call back.
	 */
	after(next: () => void) {
		this.#next = next
	}

	/**
	 * The drawer finished animating. Only the closing end carries a follow-up,
	 * and a swipe or overlay dismiss simply has none.
	 */
	settled(open: boolean) {
		if (open) return
		const next = this.#next
		this.#next = null
		next?.()
	}
}

export const addFiles = new AddFiles()
