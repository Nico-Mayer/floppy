import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import {
	CancelReceive,
	CancelSend,
	ClearInputCache,
	Describe,
	QuickShare,
	Receive,
	events,
	type FileEntry,
	type ProgressEvent
} from '$lib/ipc'
import { open, type OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import type { ReceiveStatus, ReceiveTarget, SendStatus, SendTarget } from './components/transfer/types'
import { describeError, describeTransferError, type AppError } from './errors'
import { haptics } from './haptics'
import { sounds } from './sounds'

/**
 * Which side of a transfer something belongs to. The transfer *kind*, carried by
 * every event payload and by `describeError` — not a mode the app is in: which
 * panel is on screen is the route's business and nothing else's.
 */
export type Mode = 'send' | 'receive'

/**
 * The two waits the panels admit to, kept together because they are the same
 * judgement made twice: a transfer that has sat this long without the other side
 * appearing is probably not going to work, and the screen should say so rather
 * than spin forever.
 *
 * A trusted send is waiting on a person to tap yes; a code receive is hunting for
 * a peer that may never have existed. Neither has anything else on screen to
 * explain the silence, so both break it after the same wait.
 */
const NO_ANSWER_HINT_DELAY = 15_000
const MISTYPED_CODE_HINT_DELAY = 15_000

class SendTransfer {
	status = $state<SendStatus>('idle')
	/**
	 * This side's failure, owned here rather than app-wide: Send and Receive are
	 * separate routes, so a shared field would render a send failure on whichever
	 * screen the user happened to be looking at, and the two sides can fail
	 * independently.
	 */
	error = $state<AppError | null>(null)
	files = $state<FileEntry[]>([])
	/** The code phrase for this send. Only ever shown for a `code` target. */
	code = $state('')
	progress = $state(0)
	stats = $state<ProgressEvent | null>(null)
	/** Where this send is going; set by start()/beginTrusted(), read by the UI. */
	target = $state<SendTarget>({ kind: 'code' })
	/**
	 * What the target picker points at: 'code' or a trusted device's fingerprint.
	 *
	 * Lives here rather than in the Send panel because it outlives both a transfer
	 * (send twice to the same laptop without re-choosing) and the panel itself, so
	 * leaving Send and coming back does not silently reset who the files were going
	 * to. `target` is the different thing — the snapshot the in-flight transfer
	 * belongs to.
	 */
	picked = $state('code')
	/** Set once a trusted send has gone unanswered for suspiciously long. */
	noAnswer = $state(false)
	#hintTimer: ReturnType<typeof setTimeout> | undefined

	get busy() {
		return this.status !== 'idle' && this.status !== 'done'
	}

	/** Combined size of the queue, for the send button and the size warning. */
	get totalSize() {
		return this.files.reduce((sum, file) => sum + file.size, 0)
	}

	add(entries: FileEntry[]) {
		if (this.status !== 'idle') return
		for (const entry of entries) {
			if (!this.files.some((file) => file.path === entry.path)) {
				this.files.push(entry)
			}
		}
	}

	removeFile(path: string) {
		this.files = this.files.filter((file) => file.path !== path)
		void haptics.removed()
	}

	/** True while a native picker is open, so a second click is ignored. */
	#picking = $state(false)

	/**
	 * The same flag, for the Send screen's idle surfaces to show they are working.
	 *
	 * It has to be read from outside because the wait is invisible otherwise: iOS
	 * dismisses the picker sheet *before* it starts loading what was chosen, and
	 * reports nothing at all until every item is ready, so the app sits on screen
	 * doing nothing visible for as long as a big selection takes. Nothing finer
	 * than a boolean is available — the platform hands back the whole selection at
	 * once or not at all, so there is no count to show and no progress to track.
	 */
	get picking() {
		return this.#picking
	}

	pickFiles() {
		return this.#pick({ multiple: true, title: 'Add files' })
	}

	/**
	 * The phone's photo library — videos as well as photos, because a gallery
	 * holds both and a clip too big to message is the thing people most want to
	 * send from a phone. Only reachable from the phone sheet; there is no photo
	 * library on a laptop.
	 */
	pickPhotos() {
		return this.#pick({ multiple: true, pickerMode: 'media' })
	}

	/**
	 * Open one native picker and queue whatever it hands back.
	 *
	 * One guard shared by both callers — the empty state is a big click target,
	 * and two *different* pickers open at once is exactly what a guard per picker
	 * would fail to catch.
	 *
	 * A picker that hands back nothing is a no-op whatever the reason: Android
	 * reports a dismissed picker as a rejection while iOS and desktop resolve
	 * with null, and telling a cancel from a failure would mean matching on a
	 * message to show something nobody asked for.
	 */
	async #pick(options: OpenDialogOptions & { multiple: true }) {
		if (this.#picking) return
		this.#picking = true
		try {
			const selected = await open(options)
			if (selected) await this.addPaths(selected)
		} catch {
			// Chose nothing.
		} finally {
			this.#picking = false
		}
	}

	/**
	 * Add paths — bare strings from a drop or the picker — resolved to entries.
	 * Folders are dropped: the picker only offers files, and the transport sends
	 * files, so a dragged-in folder must not reach the queue.
	 */
	async addPaths(paths: string[]) {
		if (!paths.length) return
		this.add(((await Describe(paths)) ?? []).filter((entry) => !entry.isDir))
	}

	async start() {
		this.error = null
		this.target = { kind: 'code' }
		this.progress = 0
		this.stats = null
		this.#clearHint()
		this.status = 'starting'
		try {
			// Quick share: the core generates a human code phrase and runs the
			// PAKE'd exchange over the broker; the phrase arrives as the code event.
			await QuickShare(this.files.map((file) => file.path))
		} catch (e) {
			this.error = describeError(e, 'send')
			this.status = 'idle'
		}
	}

	/**
	 * Enter the connecting state for a trusted-device send. Unlike start() this
	 * serves nothing yet: the pairing layer offers the files and the real send
	 * begins only when the peer accepts, arriving as the usual code event.
	 * So for this target 'starting' means "waiting for them to accept" and
	 * 'waiting' means "accepted, the transfer is connecting"; the panel says as much
	 * instead of showing a code phrase nobody needs to read.
	 */
	beginTrusted(device: { fingerprint: string; name: string }) {
		this.target = { kind: 'device', ...device }
		this.progress = 0
		this.stats = null
		this.#clearHint()
		this.status = 'starting'
		// Only this target waits on an answer, so only this one arms the hint: a code
		// send publishes a phrase and there is no yes outstanding to explain.
		this.#hintTimer = setTimeout(() => (this.noAnswer = true), NO_ANSWER_HINT_DELAY)
	}

	/**
	 * The peer accepted a trusted offer. Leave the 'waiting for a yes' screen for
	 * the accepted/connecting state; the first progress event takes it to
	 * 'sending'. A trusted send emits no code phrase, so this (and progress) are
	 * the only things that move it off 'starting'.
	 */
	accepted() {
		this.#clearHint()
		if (this.status === 'starting') this.status = 'waiting'
	}

	async cancel() {
		// CancelSend resolves as soon as the core has been told to stop, not once
		// it has finished unwinding — so the button never appears to hang. Any
		// leftover unwinding is absorbed by the next Send (StartError::Unwinding).
		this.status = 'cancelling'
		try {
			await CancelSend()
		} finally {
			// The queue survives: cancelling means "not now", and picking the
			// same files again by hand is the tedious part.
			this.#clearTransfer()
		}
	}

	/**
	 * The other side has it all. The queue stays for the completion summary, but
	 * the sandbox copies behind it do not: they have been delivered, and on a
	 * phone a queue of videos is the biggest thing the app is holding.
	 *
	 * Safe to reap here because the done screen reads only the in-memory entries
	 * (names and sizes for the summary), never the bytes. Not done on cancel —
	 * cancelling keeps the queue so the same files can be sent again, and those
	 * entries have to keep pointing at readable files.
	 */
	complete() {
		this.#clearHint()
		this.status = 'done'
		void ClearInputCache().catch(() => {})
	}

	/**
	 * Give up on this attempt but keep the queue, the way cancel does. Every way a
	 * send can end without sending goes through here — cancelled, declined, target
	 * offline, refused before it started — so which of them happened never decides
	 * whether the files are still there. The caller sets `error` afterwards if
	 * there is something to say.
	 *
	 * Not reset(): that reaps the sandbox copies the entries point at, which is
	 * only ever right when the queue is going away with them.
	 */
	stop() {
		this.#clearTransfer()
	}

	/**
	 * Clear the queue and everything behind it.
	 *
	 * Only ever call this when no send is serving. The core imports files by
	 * reference, so the blob store points at these sandbox copies rather than
	 * holding its own — deleting them under a live passive send would leave the
	 * receiver fetching a file that is no longer there. One caller: the done
	 * screen's "Send more files". A send that failed uses stop() instead.
	 */
	reset() {
		this.#clearTransfer()
		this.files = []
		// The queue is empty, so any sandbox copies made for it (mobile picks)
		// can go. No-op on desktop, where nothing was copied.
		void ClearInputCache().catch(() => {})
	}

	#clearTransfer() {
		this.#clearHint()
		this.code = ''
		this.target = { kind: 'code' }
		this.progress = 0
		this.stats = null
		this.status = 'idle'
	}

	#clearHint() {
		clearTimeout(this.#hintTimer)
		this.#hintTimer = undefined
		this.noAnswer = false
	}
}

class ReceiveTransfer {
	status = $state<ReceiveStatus>('idle')
	/** This side's failure. See the note on SendTransfer.error. */
	error = $state<AppError | null>(null)
	code = $state('')
	savedTo = $state('')
	progress = $state<number | null>(null)
	stats = $state<ProgressEvent | null>(null)
	/** Where this receive came from; set by start()/beginTrusted(), read by the UI. */
	target = $state<ReceiveTarget>({ kind: 'code' })
	/** Set once the connect attempt has taken suspiciously long. */
	tooSlow = $state(false)
	#hintTimer: ReturnType<typeof setTimeout> | undefined

	get busy() {
		return this.status !== 'idle' && this.status !== 'done'
	}

	async start() {
		this.error = null
		this.target = { kind: 'code' }
		this.progress = null
		this.stats = null
		this.tooSlow = false
		this.status = 'connecting'
		this.#hintTimer = setTimeout(() => (this.tooSlow = true), MISTYPED_CODE_HINT_DELAY)
		try {
			await Receive(this.code)
		} catch (e) {
			this.error = describeError(e, 'receive')
			this.stop()
		}
	}

	/**
	 * Enter the connecting state for an accepted trusted-device transfer. The
	 * sender starts first; the first receive progress event flips this to receiving once bytes
	 * arrive. No mistyped-code hint — there was no code to mistype. The offer is
	 * kept as the target so the panel can name the sender and what it is bringing
	 * before a single byte has landed.
	 */
	beginTrusted(offer: { name: string; fileCount: number; totalBytes: number }) {
		this.error = null
		this.target = { kind: 'device', ...offer }
		this.savedTo = ''
		this.progress = null
		this.stats = null
		this.tooSlow = false
		this.status = 'connecting'
	}

	/** True while progress events are still meaningful for this transfer. */
	get transferring() {
		return this.status === 'connecting' || this.status === 'receiving'
	}

	/** The peer answered: bytes are moving, so the code was right. */
	connected() {
		this.#clearHint()
		if (this.status === 'connecting') this.status = 'receiving'
	}

	/** Files are on disk at dest. */
	complete(dest: string) {
		this.#clearHint()
		this.savedTo = dest
		this.status = 'done'
	}

	/** Give up on this attempt but keep the code around to be corrected. */
	stop() {
		this.#clearHint()
		this.status = 'idle'
	}

	async cancel() {
		this.#clearHint()
		this.status = 'cancelling'
		try {
			await CancelReceive()
		} finally {
			// Keep the code: the usual reason to cancel is a typo in it.
			this.#clearTransfer()
		}
	}

	reset() {
		this.#clearTransfer()
		this.code = ''
	}

	#clearTransfer() {
		this.#clearHint()
		this.savedTo = ''
		this.target = { kind: 'code' }
		this.progress = null
		this.stats = null
		this.status = 'idle'
	}

	#clearHint() {
		clearTimeout(this.#hintTimer)
		this.#hintTimer = undefined
		this.tooSlow = false
	}
}

class TransferApp {
	send = new SendTransfer()
	receive = new ReceiveTransfer()

	/**
	 * Subscribe to transfer events; returns the cleanup for onMount. Payloads
	 * are typed by the generated bindings (events.rs). Send and receive share
	 * one progress/done/error event each, told apart by `kind`.
	 */
	listen() {
		// events.*.listen resolves an unlisten asynchronously; collect the
		// promises and tear them all down on cleanup. File drops come from
		// Tauri's native webview drag-drop, wired in +page.svelte.
		const subs = [
			events.codeEvent.listen((e) => {
				this.send.code = e.payload.code
				this.send.status = 'waiting'
			}),
			events.progressEvent.listen((e) => {
				const p = e.payload
				if (p.kind === 'send') {
					// A code send's phrase event flips 'starting' → 'waiting' before
					// any bytes move, so it is never in 'starting' here — this can't
					// hide the code screen. A trusted send has no phrase event, so it
					// sits in 'starting' until bytes move: treat the first progress as
					// the signal that it is now sending.
					const s = this.send.status
					if (s === 'starting' || s === 'waiting' || s === 'sending') {
						this.send.stats = p
						this.send.progress = p.percent
						this.send.status = 'sending'
					}
				} else {
					// Ignore progress once the transfer is over: a tick can still
					// be in flight when the done event lands, and acting on it
					// would pull the panel back off its completion screen.
					if (!this.receive.transferring) return
					// A receiver has no byte counts until the peer answers, so the
					// first progress event doubles as the "connected" signal.
					this.receive.connected()
					this.receive.stats = p
					this.receive.progress = p.percent
				}
			}),
			events.doneEvent.listen((e) => {
				if (e.payload.kind === 'send') this.send.complete()
				else this.receive.complete(e.payload.dest)
				// One success note, whichever direction finished. Fire and forget: a
				// buzz must never hold up or fail a transfer's completion.
				void haptics.transferDone()
				// And the same moment on the other channel, for the case the buzz
				// cannot cover: a desktop, or a phone put down across the room.
				sounds.transferDone()
			}),
			events.deepLink.listen((e) => {
				// A floppy://receive?code=… link opened the app: go to Receive and
				// prefill the code, but never auto-start (drive-by risk). The
				// navigation is the whole point — the link can arrive on any route,
				// and prefilling a screen the user is not looking at arms a panel
				// silently.
				//
				// The pairing kind is pairing's business and is picked up there, on its
				// own listener over this same event: the kinds are exclusive, so neither
				// side has to know what the other does with it, and this module stays
				// free of a dependency on the pairing one (which depends on this).
				if (e.payload.kind !== 'receive') return
				this.receive.code = e.payload.code
				void goto(resolve('/receive'))
			}),
			events.errorEvent.listen((e) => {
				// The core reports which side failed, the class of failure, and the
				// sentence to show. Only the side
				// that actually failed is touched: a send and a receive can run at
				// once, and one failing must not wipe the other's panel or its error.
				if (e.payload.kind === 'send') {
					this.send.error = describeTransferError(e.payload.code, e.payload.message, 'send')
					if (this.send.status !== 'done') this.send.status = 'idle'
				} else {
					this.receive.error = describeTransferError(e.payload.code, e.payload.message, 'receive')
					if (this.receive.status !== 'done') this.receive.stop()
				}
				// One failure note, whichever side broke. A local cancel emits no
				// terminal event, so it stays silent by construction. Haptic only:
				// sound never carries bad news (see the closing note in sounds.ts).
				void haptics.failed()
			})
		]
		return () => subs.forEach((sub) => sub.then((unlisten) => unlisten()))
	}
}

export const app = new TransferApp()
