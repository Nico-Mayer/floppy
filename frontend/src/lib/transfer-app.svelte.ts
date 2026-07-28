import { CancelReceive, CancelSend, Receive, Send } from '$bindings/floppy/internal/services/crocservice'
import { Describe, SelectFiles } from '$bindings/floppy/internal/services/fileservice'
import type { FileEntry, ProgressEvent } from '$bindings/floppy/internal/services/models'
import { Events } from '@wailsio/runtime'
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

	async pickFiles() {
		this.add((await SelectFiles()) ?? [])
	}

	async start() {
		app.error = null
		this.target = { kind: 'code' }
		this.progress = 0
		this.stats = null
		this.status = 'starting'
		try {
			await Send(this.files.map((file) => file.path))
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
	 * Subscribe to croc events; returns the cleanup for onMount. Handler
	 * payloads are inferred from the generated CustomEvents map — every croc
	 * event carries the transfer `id` and `kind` alongside its own fields.
	 */
	listen() {
		const unsubs = [
			Events.On('files-dropped', async (ev) => {
				// Drops arrive as bare paths; the Go side turns them into entries
				// with sizes, the same shape the picker returns.
				this.send.add((await Describe(ev.data ?? [])) ?? [])
			}),
			Events.On('croc:code', (ev) => {
				this.send.code = ev.data.code
				this.send.status = 'waiting'
			}),
			Events.On('croc:send:progress', (ev) => {
				// Progress only makes sense once the code phrase exists — never
				// let a stray progress line hide the code screen.
				if (this.send.status === 'waiting' || this.send.status === 'sending') {
					this.send.stats = ev.data
					this.send.progress = ev.data.percent
					this.send.status = 'sending'
				}
			}),
			Events.On('croc:recv:progress', (ev) => {
				// Ignore progress once the transfer is over: a poll tick can
				// still be in flight when croc:received lands, and acting on it
				// would pull the panel back off its completion screen.
				if (!this.receive.transferring) return
				// A receiver has no byte counts until the peer answers, so the
				// first progress event doubles as the "connected" signal.
				this.receive.connected()
				this.receive.stats = ev.data
				this.receive.progress = ev.data.percent
			}),
			Events.On('croc:sent', () => {
				this.send.status = 'done'
			}),
			Events.On('croc:received', (ev) => {
				this.receive.complete(ev.data.dest ?? '')
			}),
			Events.On('croc:error', (ev) => {
				// The backend reports which side failed and a machine-readable
				// code; the raw message is croc's and needs translating.
				this.error = describeError(ev.data.message, ev.data.kind)
				// Only the side that actually failed resets: a send and a
				// receive can run at once, and one failing must not wipe the
				// other's panel.
				if (ev.data.kind === 'send') {
					if (this.send.status !== 'done') this.send.status = 'idle'
				} else if (this.receive.status !== 'done') {
					this.receive.stop()
				}
			})
		]
		return () => unsubs.forEach((unsub) => unsub())
	}
}

export const app = new TransferApp()
