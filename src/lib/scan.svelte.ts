// Reading a QR code with the camera, and the only place that knows the scanner
// plugin exists.
//
// Same arrangement as `lib/ipc`: the plugin's shape — its permission states, what
// a cancel looks like coming back, what its errors say — stops here, and callers
// get four outcomes they can branch on.
//
// The camera runs *windowed*: the plugin draws it behind the webview rather than
// taking the screen, so the app keeps its own controls on top and the user is
// never stranded in an OS surface with no way back. That costs a transparent
// webview while it runs, which is what `active` is for — see ScanSheet.svelte and
// the `html[data-scanning]` rules in layout.css.
//
// This owns the whole attempt, not just the read, because a decoded code is the
// middle of the story rather than the end: the sheet has to say it caught
// something, then that the thing it started is under way, then either it is done
// or what went wrong and that you can aim again. Closing the camera the instant a
// code decoded left all of that invisible.
//
// It is not tied to one flow. Adding a device and taking a transfer both point a
// camera at a code, so the caller supplies what a decoded code means (`handle`),
// what the surface says while it happens (`copy`), and whether the thing it
// started is worth waiting on (`wait`). Everything else — the permission, the
// warm-up, the beats, the single ending — is the same both times.
//
// Mobile only. The plugin exists for Android and iOS; on desktop every flow that
// would open this has the code field instead, so nothing here is called and no
// camera is requested.

import {
	Format,
	cancel,
	checkPermissions,
	openAppSettings,
	requestPermissions,
	scan
} from '@tauri-apps/plugin-barcode-scanner'
import { errorText } from './errors'
import { haptics } from './haptics'
import { normal } from './motion'
import { isPhoneChrome } from './platform'

export type ScanOutcome =
	/** A code was read and handled. Nothing is left for the caller to do. */
	| { kind: 'done' }
	/** The user went back to the app without scanning. Nothing else should open. */
	| { kind: 'cancelled' }
	/** The user asked to type the code instead. */
	| { kind: 'type' }
	/** No camera to use: permission refused, or none on this device. */
	| { kind: 'denied' }
	/** Anything else went wrong. `message` is for a toast. */
	| { kind: 'failed'; message: string }

/**
 * What the sheet is showing.
 *
 * `aiming` is the live camera. `caught` and `added` are the two beats a successful
 * scan earns: something was read, and it worked. `retry` is a code that did not
 * work, with the camera live again underneath it.
 */
export type ScanPhase = 'aiming' | 'caught' | 'added' | 'retry'

/** A headline and the line under it. */
type Line = { headline: string; hint: string }

/**
 * What the surface says, supplied by whoever opened the camera. The `retry`
 * phase is not here: "that code didn't work" is the same sentence in every flow
 * and the reason under it is the error's own (see `problem`).
 */
export type ScanCopy = {
	/** Live camera: what to point at, and where the other device shows it. */
	aim: Line
	/** A code was read and what it started is under way. `slow` needs a `wait`. */
	caught: Line & { slow?: string }
	/** It worked, held on screen just long enough to read. */
	done: Line
}

/**
 * How long to let the thing a code started run before saying so, and before
 * giving up on it.
 *
 * Only for a caller whose `handle` waits on something outside this device — a
 * pairing waits on a person looking at another phone. A `handle` that resolves as
 * soon as it has started something local passes nothing, and then there is no
 * bound to inherit on a thing that takes milliseconds.
 */
export type ScanWait = {
	/** Say the wait is long, in ms. */
	slow: number
	/** Give up, in ms. */
	limit: number
	/** What to say on giving up. */
	gaveUp: string
}

/** What one attempt is: the meaning of a code, the words, and any wait. */
export type ScanIntent = {
	handle: (content: string) => Promise<void>
	copy: ScanCopy
	wait?: ScanWait
}

/** How long "added" stays up before the camera closes. Long enough to read. */
const ADDED_HOLD = 900

/**
 * How long the window stays filled after the camera is asked for.
 *
 * The plugin says nothing about when the camera is actually up, and it is not
 * instant. Punching the hole immediately therefore shows a black square for a
 * couple of hundred milliseconds — which reads as broken, not as loading. So the
 * window holds its own surface for about as long as a camera takes to start, and
 * becomes a hole after.
 */
const CAMERA_WARM = 350

/**
 * How long to let the chrome arrive before asking for the camera.
 *
 * This is the ordering that made opening feel wrong. `scan()` is an invoke: the
 * native side makes the webview transparent and attaches the camera as soon as it
 * is called, which — called in the same microtask as `active` — happened before
 * Svelte had rendered the sheet at all. The camera therefore appeared first, over a
 * fully painted app, and the chrome caught up afterwards.
 *
 * So the camera is asked for one beat after the chrome is on screen. Matched to the
 * sheet's own transition, and floored above zero under reduced motion, where the
 * chrome still needs a frame to paint.
 */
const chromeIn = () => Math.max(normal(), 50)

/**
 * Stand-in copy, never read: `run` sets the caller's words before `active` goes
 * true, and the sheet only renders while it is.
 */
const NO_COPY: ScanCopy = {
	aim: { headline: '', hint: '' },
	caught: { headline: '', hint: '' },
	done: { headline: '', hint: '' }
}

/** Whether this build can scan at all. Form factor, not pointer type or width. */
export function canScan(): boolean {
	return isPhoneChrome
}

/** Send the user to the OS settings page for this app, to turn the camera on. */
export function openSettings(): Promise<void> {
	return openAppSettings()
}

class Scanner {
	/** Whether the camera surface is up right now. */
	active = $state(false)
	phase = $state<ScanPhase>('aiming')
	/** Why the last code did not work, shown so the user can aim at another one. */
	problem = $state('')
	/** The other device is taking its time, so the wait says more about itself. */
	slow = $state(false)
	/** The camera has been asked for but is probably not showing anything yet. */
	warming = $state(false)
	/** What this attempt's surface says. The sheet reads it; the caller wrote it. */
	copy = $state<ScanCopy>(NO_COPY)

	#settle: ((outcome: ScanOutcome) => void) | null = null
	#timers: ReturnType<typeof setTimeout>[] = []

	/**
	 * Ask for the camera and keep it up until something ends the attempt.
	 * `intent.handle` is what to do with a decoded code — it resolves when the thing
	 * it started is agreed and throws when the code is refused. Never throws itself:
	 * every way this can end is one of the outcomes, because the caller has somewhere
	 * to go in all of them.
	 *
	 * The permission is settled before the chrome appears, so a refusal never
	 * flashes a viewfinder that was never going to work.
	 */
	async run(intent: ScanIntent): Promise<ScanOutcome> {
		if (!canScan()) return { kind: 'denied' }
		if (this.active) return { kind: 'cancelled' }

		try {
			let state = await checkPermissions()
			if (state === 'prompt') state = await requestPermissions()
			if (state !== 'granted') return { kind: 'denied' }
		} catch (error) {
			return { kind: 'failed', message: describe(error) }
		}

		this.copy = intent.copy
		this.active = true
		this.phase = 'aiming'
		this.problem = ''
		this.slow = false
		// The document flag belongs to ScanSheet, which sets it as it appears and
		// clears it when its exit transition ends. Doing it here would drop the shell
		// out from under a sheet that has not arrived yet, and bring it back under one
		// that is still leaving.
		// Filled from the outset: there is no camera yet, and there is about to be a
		// hole where one is expected. #read restarts this timer from the moment the
		// camera is actually asked for.
		this.warming = true

		return new Promise<ScanOutcome>((settle) => {
			this.#settle = settle
			this.#timers.push(setTimeout(() => void this.#read(intent), chromeIn()))
		})
	}

	/**
	 * Go back to the app: no scan, or an answer this person is done waiting for.
	 * Available in every phase, because "this is not working" can happen in any of
	 * them and the app is what the user wants back.
	 */
	stop() {
		this.#end({ kind: 'cancelled' })
	}

	/** Give up on the camera and type the code instead. */
	typeInstead() {
		this.#end({ kind: 'type' })
	}

	/**
	 * One pass of the camera: read, then live with what came back. A code that is
	 * refused loops straight back here with the reason on screen, because the fix is
	 * to point at a different code and the camera is already in your hand.
	 */
	async #read(intent: ScanIntent) {
		// The hole opens a beat after the camera is asked for, not a beat after the
		// attempt started: on a retry the chrome is already up, and what matters both
		// times is how long this camera takes to have something to show.
		this.warming = true
		this.#timers.push(setTimeout(() => (this.warming = false), CAMERA_WARM))

		let content: string
		try {
			const result = await scan({ windowed: true, formats: [Format.QRCode], cameraDirection: 'back' })
			content = result.content.trim()
		} catch (error) {
			// A dismissed scanner comes back as an error rather than an empty result,
			// so telling the two apart is a string match on the plugin's own wording.
			// It is the one place in the app that matches on a message, and it is
			// contained here: guessing wrong costs a toast, never a wrong code redeemed.
			if (looksCancelled(error)) this.#end({ kind: 'cancelled' })
			else this.#end({ kind: 'failed', message: describe(error) })
			return
		}

		// Something was read. Say so before anything slower happens: the buzz and the
		// filled frame are the only proof the camera did its job, and what follows can
		// take a couple of seconds.
		if (!this.#settle) return
		this.phase = 'caught'
		this.problem = ''
		this.slow = false
		void haptics.scanned()

		// The wait has a floor of "say something" and a ceiling of "stop waiting".
		// Without the ceiling a wait on another person sits on the core's own bound
		// with a spinner and no way out, which is the one state a camera surface must
		// never have. Only armed for a caller that waits: a handle which returns as
		// soon as it has started something here is done before either timer would fire,
		// and arming them anyway would put a give-up bound on nothing.
		const { wait } = intent
		if (wait) {
			this.#timers.push(
				setTimeout(() => (this.slow = true), wait.slow),
				setTimeout(() => this.#end({ kind: 'failed', message: wait.gaveUp }), wait.limit)
			)
		}

		try {
			await intent.handle(content)
		} catch (error) {
			// The code was readable and wrong: spent, this device's own, or a code for
			// the app's other flow. Worth staying for, since the next code is one aim
			// away.
			if (!this.#settle) return
			this.#clearTimers()
			this.phase = 'retry'
			this.slow = false
			this.problem = errorText(error)
			void this.#read(intent)
			return
		}

		if (!this.#settle) return
		this.#clearTimers()
		this.phase = 'added'
		this.slow = false
		this.#timers.push(setTimeout(() => this.#end({ kind: 'done' }), ADDED_HOLD))
	}

	/**
	 * Settle the attempt once, whichever of the ways got here first: the plugin
	 * returned, the plugin threw, the user pressed something, or the handle finished.
	 * `cancel()` makes a running `scan()` reject, so a stop would otherwise settle a
	 * second time with a cancel the caller has already been told about.
	 */
	#end(outcome: ScanOutcome) {
		const settle = this.#settle
		this.#settle = null
		this.#clearTimers()
		this.active = false
		this.phase = 'aiming'
		this.problem = ''
		this.slow = false
		// Fill the window on the way out rather than clearing the flag: the camera is
		// about to stop while the chrome is still fading, and a hole with no camera
		// behind it is a black square. It leaves as a surface instead.
		this.warming = true
		void cancel().catch(() => {})
		settle?.(outcome)
	}

	#clearTimers() {
		this.#timers.forEach(clearTimeout)
		this.#timers = []
	}
}

export const scanner = new Scanner()

function describe(error: unknown): string {
	if (error instanceof Error) return error.message
	return typeof error === 'string' ? error : "The camera didn't open. Try again, or type their code."
}

function looksCancelled(error: unknown): boolean {
	const text = (error instanceof Error ? error.message : String(error)).toLowerCase()
	return text.includes('cancel') || text.includes('closed')
}
