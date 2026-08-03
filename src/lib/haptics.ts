// Haptic feedback, for the few moments where something is handed to you, taken
// away, or arrives for you. Not for ordinary taps: a buzz on everything stops
// meaning anything.
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

// For moments driven by a backend event rather than the user's own finger.
// Those only fire while the app is on screen: backgrounded, the OS notification
// for the same event carries the alert with the system's own sound and
// vibration settings, and buzzing twice for one event is noise. Finger-driven
// moments need no such gate — the finger is on the glass, so the app is
// foreground by construction.
async function feelVisible(run: () => Promise<unknown>): Promise<void> {
	if (document.visibilityState !== 'visible') return
	return feel(run)
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
	declined: () => feel(() => impactFeedback('light')),
	/** An offer or a pairing request arrived: something is waiting on an answer. */
	arrived: () => feelVisible(() => notificationFeedback('warning')),
	/** A pairing completed, on either side. The same note as a finished transfer. */
	paired: () => feelVisible(() => notificationFeedback('success')),
	/** The other device said yes to a trusted send. The wait is over. */
	peerAccepted: () => feelVisible(() => impactFeedback('medium')),
	/** A transfer or pairing failed, or the other device declined. One note for all. */
	failed: () => feelVisible(() => notificationFeedback('error')),
	/** A pull-to-refresh crossed its trigger: the finger learns release will commit. */
	pullTriggered: () => feel(() => impactFeedback('light'))
	// No entry for changing destination. That used to be a swipe that could commit
	// or spring back, which is a moment worth feeling; it is now a tap on a bar
	// item, which takes nothing and hands over nothing.
}
