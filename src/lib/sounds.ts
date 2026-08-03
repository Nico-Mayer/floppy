// Sound feedback, for the two things worth making a noise about: a flow you were
// waiting on has finished, or someone is waiting on you.
//
// A sibling to haptics.ts and deliberately shaped like it — moments named by what
// happened, the mapping from a moment to an actual sound in one place, and a
// failure that can never reach the user. Three differences are load-bearing:
//
//   - Not gated on pointer type. Haptics no-op on a fine pointer because a mouse
//     has nothing to feel them with. A desktop has speakers, and a desktop is the
//     case with no other non-visual channel at all — a transfer that finishes
//     behind another window says nothing there today.
//
//   - Gated on window focus, not on page visibility. haptics.ts reads
//     document.visibilityState, which stays 'visible' for a desktop window
//     sitting behind another one — and that is exactly when the core raises an OS
//     notification (notify_done in src-tauri/src/lib.rs, reading a foreground flag
//     fed by WindowEvent::Focused). A visibility gate would sound twice for one
//     event, so this tracks the same focus events the core does.
//
//   - No off switch, anywhere. That is a decision rather than an omission, and it
//     is what sets everything else here: two soft tones over three moments, none
//     loud, none unpleasant. Restraint is doing the job a settings toggle would.
//
// Tones are synthesized rather than loaded: no asset to bundle, licence, decode,
// or admit through the CSP, and retuning is one table in this file.

import { getCurrentWindow } from '@tauri-apps/api/window'

/** One note. `after` is the silence that follows it before the next note. */
type Note = { hz: number; ms: number; after?: number; gain?: number }

// Sine throughout. It has no upper harmonics, so it reads as a soft chime; a
// triangle or square carries an edge that turns grating on the tenth transfer of
// the day. Everything sits an octave below the usual UI chirp for the same
// reason — high frequencies are what make a sound feel piercing.
//
// Rising reads as "finished", a repeat as "your turn". With no falling or
// dissonant tone in the set, nothing here has to sound like bad news, which is
// what lets both of them stay warm.

/** A transfer or a pairing finished. Rising perfect fifth, C5 → G5. */
const DONE: Note[] = [
	{ hz: 523.25, ms: 90, after: 20 },
	{ hz: 783.99, ms: 90 }
]

/** Something arrived that waits on an answer. E5 twice, the second softer. */
const ALERT: Note[] = [
	{ hz: 659.25, ms: 70, after: 70 },
	{ hz: 659.25, ms: 70, gain: 0.7 }
]

/** Audible across a desk in a quiet room. Not across an office. */
const MASTER_GAIN = 0.06

/** Long enough to round off the attack, short enough to still read as a strike. */
const ATTACK_SECONDS = 0.006

// Created on the first user gesture rather than at load — see unlock(). Null
// until then, which makes every call below a no-op, which is exactly what a
// webview that has not been unlocked would do anyway.
let context: AudioContext | null = null

// Seeded true to match the core's `AtomicBool::new(true)`: a just-launched app is
// in front. Reassigned wholesale by the fallback path below rather than branched
// on at every call.
let focused = true
let isFocused = () => focused

/**
 * One note, scheduled at `at`.
 *
 * The envelope is not a detail. An oscillator that starts or stops at full
 * amplitude is a step discontinuity, which is a click, and clicks are most of
 * what makes synthesized interface sound feel cheap. Decay is exponential
 * because a linear fade to zero still ends on a discontinuity, and
 * exponentialRampToValueAtTime cannot target exactly zero — so it aims at
 * near-silence and the oscillator stops there.
 */
function strike(ctx: AudioContext, note: Note, at: number): void {
	const seconds = note.ms / 1000
	const peak = MASTER_GAIN * (note.gain ?? 1)

	const osc = ctx.createOscillator()
	osc.type = 'sine'
	osc.frequency.value = note.hz

	const envelope = ctx.createGain()
	envelope.gain.setValueAtTime(0, at)
	envelope.gain.linearRampToValueAtTime(peak, at + ATTACK_SECONDS)
	envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)

	osc.connect(envelope).connect(ctx.destination)
	osc.start(at)
	osc.stop(at + seconds)
}

/**
 * Play a tone, or do nothing at all.
 *
 * Two silent refusals, both of them normal rather than exceptional: no context
 * means the user has not interacted yet, so the webview would refuse anyway; not
 * focused means the OS notification is carrying this event and a second sound
 * would be noise.
 */
function play(tone: Note[]): void {
	const ctx = context
	if (!ctx || !isFocused()) return
	try {
		let at = ctx.currentTime
		for (const note of tone) {
			strike(ctx, note, at)
			at += (note.ms + (note.after ?? 0)) / 1000
		}
	} catch {
		// Nothing to do and nothing to say. These fire from transfer and pairing
		// paths, and a webview that will not make a sound must be indistinguishable
		// from one that did — whatever asked for the tone has already happened.
	}
}

export const sounds = {
	/** A transfer finished, in either direction. */
	transferDone: () => play(DONE),
	/**
	 * A pairing completed, on either side. The same note as a finished transfer,
	 * on purpose: both report the one fact that the thing you were waiting on is
	 * done, and splitting them would ask you to learn a distinction the screen
	 * already tells you in the second it takes to look.
	 */
	paired: () => play(DONE),
	/** An offer or a pairing request arrived: someone is waiting on your answer. */
	arrived: () => play(ALERT)
}

// What deliberately makes no sound, and why. Both groups fire haptics, so every
// one of them looks like an oversight until you know it is not.
//
// Failures — a transfer breaking mid-flight, a pairing failing, the other device
// declining. Sound never carries bad news here. A failure raises no OS
// notification (notify_done fires on Done alone, and says so), and a tone only
// plays while the window is focused, so a failure tone could only ever have
// reached someone who already had the error on screen in front of them. That
// buys nothing, and an unpleasant noise is the worst thing to hand someone who
// has no way to switch it off.
//
// Everything else — copied, scanned, removed, accepted, declined, pullTriggered,
// peerAccepted. The first six are the user's own finger on a control with their
// eyes on the result; a haptic is free there because the device is in their hand,
// a sound is not because the room hears it. peerAccepted is a step inside a flow
// rather than its outcome, and transferDone follows within seconds — two tones
// seconds apart read as a malfunction rather than as two facts.
//
// This list only grows on the same reasoning, and never for a failure.

/**
 * Wire up focus tracking and first-gesture unlock. Call once, from the layout.
 * Returns a disposer, like the layout's other subscriptions.
 */
export function initSoundFeedback(): () => void {
	let unlistenFocus: (() => void) | undefined

	getCurrentWindow()
		.onFocusChanged(({ payload }) => {
			focused = payload
		})
		.then((unlisten) => {
			unlistenFocus = unlisten
		})
		.catch(() => {
			// No IPC bridge, which means the browser preview at :1420. Ask the DOM
			// instead: its answer is right on desktop, and a preview tab is the only
			// place this path runs.
			isFocused = () => document.hasFocus()
		})

	window.addEventListener('pointerdown', unlock, { once: true, capture: true, passive: true })
	window.addEventListener('keydown', unlock, { once: true, capture: true, passive: true })

	return () => {
		unlistenFocus?.()
		window.removeEventListener('pointerdown', unlock, { capture: true })
		window.removeEventListener('keydown', unlock, { capture: true })
	}
}

/**
 * Build the AudioContext inside the user's first gesture.
 *
 * Every moment that plays a tone is driven by a backend event rather than a tap,
 * and browsers suspend an AudioContext until a gesture — so without this the
 * first tone of a session would be refused. Building it here rather than at load
 * also means there is no suspended context to reason about: before the first
 * interaction it is simply null.
 *
 * The one case this loses is an event arriving before the user has touched
 * anything at all (a deep-link cold start). A silent first arrival is a fair
 * price for not carrying a second state.
 */
function unlock(): void {
	if (context) return
	try {
		const ctx = new AudioContext({ latencyHint: 'interactive' })
		void ctx.resume()

		// WebKit has historically wanted a buffer actually played inside the
		// gesture, not just a resume(). One silent sample satisfies it and cannot
		// be heard.
		const silent = ctx.createBufferSource()
		silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
		silent.connect(ctx.destination)
		silent.start()

		pinAmbientSession()
		context = ctx
	} catch {
		// No audio device, or the webview refused to start one. Every sounds.* call
		// stays a no-op and nothing upstream is any the wiser.
	}
}

/**
 * Ask for the ambient audio session, which is exactly the pair of properties
 * this feature wants: mixable, so a tone never pauses or ducks what someone is
 * listening to, and subject to the iOS ringer switch, so a silenced phone stays
 * silent. Not 'playback' (exclusive, and ignores the switch) and not 'transient'
 * (ducks other audio).
 *
 * WebKit ships the type property; Chromium has no AudioSession API at all, so on
 * Android and on Chromium-based desktop webviews this is a no-op — and their
 * default for a bare AudioContext already mixes.
 *
 * Note what is deliberately absent: the usual trick for keeping Web Audio alive
 * through the iOS ringer switch is to loop a silent HTMLAudioElement, which
 * promotes the session to 'playback'. That is for web games that need sound. Here
 * it would override a hardware switch the user flipped on purpose, and would make
 * us duck other apps — with no in-app switch to offer as an apology. Don't add it.
 */
function pinAmbientSession(): void {
	const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
	if (session) session.type = 'ambient'
}
