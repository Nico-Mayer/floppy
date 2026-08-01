// Haptic feedback, for the few moments where something is handed to you or taken
// away. Not for ordinary taps: a buzz on everything stops meaning anything.
//
// Named by moment rather than by intensity, so a call site reads as what
// happened and the mapping to a feedback style lives here alone.
//
// Two things every call relies on:
//   - It is a no-op unless the pointer is coarse. There is no desktop haptics
//     plugin to call, and a mouse has nothing to feel it with.
//   - It can never fail loudly. These fire from transfer paths, and a missing
//     plugin, a denied permission, or a device without a vibrator must be
//     indistinguishable from success as far as the app is concerned. The plugin
//     reports failure by returning a Result rather than rejecting, so both the
//     rejection and the error result are swallowed.
//
// Deliberately not gated on `prefers-reduced-motion`. That setting is about
// visual and vestibular motion; haptic strength has its own OS-level control,
// which the platform already honours below us.

import { impactFeedback, notificationFeedback } from '@tauri-apps/plugin-haptics'
import { isTouch } from './platform'

async function feel(run: () => Promise<unknown>): Promise<void> {
	if (!isTouch()) return
	try {
		await run()
	} catch {
		// Nothing to do and nothing to say: feedback is a nicety, and the action
		// that asked for it has already happened.
	}
}

export const haptics = {
	/** A code was copied to the clipboard. */
	copied: () => feel(() => impactFeedback('light')),
	/** A QR code was read: the camera caught something, before anything is known. */
	scanned: () => feel(() => impactFeedback('medium')),
	/** A file was taken out of the send queue. */
	removed: () => feel(() => impactFeedback('light')),
	/** A transfer finished, in either direction. The one success note. */
	transferDone: () => feel(() => notificationFeedback('success')),
	/** An incoming transfer was accepted. Heavier than declining: more happened. */
	accepted: () => feel(() => impactFeedback('medium')),
	/** An incoming transfer was declined. */
	declined: () => feel(() => impactFeedback('light'))
	// No entry for changing destination. That used to be a swipe that could commit
	// or spring back, which is a moment worth feeling; it is now a tap on a bar
	// item, which takes nothing and hands over nothing.
}
