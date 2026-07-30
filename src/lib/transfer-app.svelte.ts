import { open } from '@tauri-apps/plugin-dialog'
import {
	CancelReceive,
	CancelSend,
	Describe,
	QuickShare,
	Receive,
	events,
	type FileEntry,
	type ProgressEvent
} from '$lib/ipc'
import { describeError, type AppError } from './components/transfer/errors'
import type { ReceiveStatus, ReceiveTarget, SendStatus, SendTarget } from './components/transfer/types'

export type Mode = 'send' | 'receive'

class SendTransfer {
	status = $state<SendStatus>('idle')
	files = $state<FileEntry[]>([])
	/** croc's phrase for this send. Only ever shown for a `code` target. */
	code = $state('')
	progress = $state(0)
	stats = $state<ProgressEvent | null>(null)
	/** Where this send is going; set by start()/beginTrusted(), read by the UI. */
	target = $state<SendTarget>({ kind: 'code' })

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
	}

	/** True while the native picker is open, so a second click is ignored. */
	#picking = false

	async pickFiles() {
		// The empty state is a big click target; one panel at a time.
		if (this.#picking) return
		this.#picking = true
		try {
			const selected = await open({ multiple: true, title: 'Add files' })
			if (selected) await this.addPaths(Array.isArray(selected) ? selected : [selected])
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
		app.error = null
		this.target = { kind: 'code' }
		this.progress = 0
		this.stats = null
		this.status = 'starting'
		try {
			// Quick share: the core generates a human code phrase and runs the
			// PAKE'd exchange over the broker; the phrase arrives as the code event.
			await QuickShare(this.files.map((file) => file.path))
		} catch (e) {
			app.error = describeError(String(e), 'send')
			this.status = 'idle'
		}
	}

	/**
	 * Enter the connecting state for a trusted-device send. Unlike start() this
	 * does not call croc — the pairing layer offers the files and the real send
	 * begins only when the peer accepts, arriving as the usual croc:code event.
	 * So for this target 'starting' means "waiting for them to accept" and
	 * 'waiting' means "accepted, croc is connecting"; the panel says as much
	 * instead of showing a code phrase nobody needs to read.
	 */
	beginTrusted(device: { fingerprint: string; name: string }) {
		this.target = { kind: 'device', ...device }
		this.progress = 0
		this.stats = null
		this.status = 'starting'
	}

	/**
	 * The peer accepted a trusted offer. Leave the 'waiting for a yes' screen for
	 * the accepted/connecting state; the first progress event takes it to
	 * 'sending'. A trusted send emits no code phrase, so this (and progress) are
	 * the only things that move it off 'starting'.
	 */
	accepted() {
		if (this.status === 'starting') this.status = 'waiting'
	}

	async cancel() {
		// CancelSend resolves as soon as croc has been told to stop, not once
		// it has finished unwinding — so the button never appears to hang.
		// Any leftover unwinding is absorbed by the next Send on the Go side.
		this.status = 'cancelling'
		try {
			await CancelSend()
		} finally {
			// The queue survives: cancelling means "not now", and picking the
			// same files again by hand is the tedious part.
			this.#clearTransfer()
		}
	}

	reset() {
		this.#clearTransfer()
		this.files = []
	}

	#clearTransfer() {
		this.code = ''
		this.target = { kind: 'code' }
		this.progress = 0
		this.stats = null
		this.status = 'idle'
	}
}

/**
 * How long a receive may sit unconnected before the UI suggests the code might
 * be wrong. croc waits for its peer forever, so nothing else ever says so.
 */
const MISTYPED_CODE_HINT_DELAY = 15_000

class ReceiveTransfer {
	status = $state<ReceiveStatus>('idle')
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
		app.error = null
		this.target = { kind: 'code' }
		this.progress = null
		this.stats = null
		this.tooSlow = false
		this.status = 'connecting'
		this.#hintTimer = setTimeout(() => (this.tooSlow = true), MISTYPED_CODE_HINT_DELAY)
		try {
			await Receive(this.code)
		} catch (e) {
			app.error = describeError(String(e), 'receive')
			this.stop()
		}
	}

	/**
	 * Enter the connecting state for an accepted trusted-device transfer. The
	 * sender starts first; croc:recv:progress flips this to receiving once bytes
	 * arrive. No mistyped-code hint — there was no code to mistype. The offer is
	 * kept as the target so the panel can name the sender and what it is bringing
	 * before a single byte has landed.
	 */
	beginTrusted(offer: { name: string; fileCount: number; totalBytes: number }) {
		app.error = null
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
	mode = $state<Mode>('send')
	error = $state<AppError | null>(null)
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
				if (e.payload.kind === 'send') this.send.status = 'done'
				else this.receive.complete(e.payload.dest)
			}),
			events.deepLink.listen((e) => {
				// A floppy://receive?code=… link opened the app: switch to receive
				// and prefill the code, but never auto-start (drive-by risk).
				this.mode = 'receive'
				this.receive.code = e.payload.code
			}),
			events.errorEvent.listen((e) => {
				// The core reports which side failed and a machine-readable code;
				// the raw message still needs translating for the user.
				this.error = describeError(e.payload.message, e.payload.kind)
				// Only the side that actually failed resets: a send and a receive
				// can run at once, and one failing must not wipe the other's panel.
				if (e.payload.kind === 'send') {
					if (this.send.status !== 'done') this.send.status = 'idle'
				} else if (this.receive.status !== 'done') {
					this.receive.stop()
				}
			})
		]
		return () => subs.forEach((sub) => sub.then((unlisten) => unlisten()))
	}
}

export const app = new TransferApp()
