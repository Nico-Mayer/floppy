import { CancelReceive, CancelSend, Receive, Send } from '$bindings/floppy/crocservice'
import { Describe, SelectFiles } from '$bindings/floppy/fileservice'
import type { FileEntry, TransferStats } from '$bindings/floppy/models'
import { Events } from '@wailsio/runtime'
import type { ReceiveStatus, SendStatus } from './components/transfer/types'

export type Mode = 'send' | 'receive'

class SendTransfer {
	status = $state<SendStatus>('idle')
	files = $state<FileEntry[]>([])
	code = $state('')
	progress = $state(0)
	stats = $state<TransferStats | null>(null)

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

	async pick() {
		this.add((await SelectFiles()) ?? [])
	}

	async start() {
		app.error = ''
		this.progress = 0
		this.stats = null
		this.status = 'starting'
		try {
			await Send(this.files.map((file) => file.path))
		} catch (e) {
			app.error = String(e)
			this.status = 'idle'
		}
	}

	async cancel() {
		// Cancel only returns once croc has released the slot, which takes a
		// couple of seconds — hold the UI there rather than snapping back to
		// idle and letting the next attempt fail as "already running".
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
	stats = $state<TransferStats | null>(null)
	/** Set once the connect attempt has taken suspiciously long. */
	tooSlow = $state(false)
	#hintTimer: ReturnType<typeof setTimeout> | undefined

	get busy() {
		return this.status !== 'idle' && this.status !== 'done'
	}

	async start() {
		app.error = ''
		this.progress = null
		this.stats = null
		this.tooSlow = false
		this.status = 'connecting'
		this.#hintTimer = setTimeout(() => (this.tooSlow = true), MISTYPED_CODE_HINT_DELAY)
		try {
			await Receive(this.code)
		} catch (e) {
			app.error = String(e)
			this.stop()
		}
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
	error = $state('')
	send = new SendTransfer()
	receive = new ReceiveTransfer()

	/** Subscribe to croc events; returns the cleanup for onMount. */
	listen() {
		const unsubs = [
			Events.On('files-dropped', async (ev: { data: string[] | null }) => {
				// Drops arrive as bare paths; the Go side turns them into entries
				// with sizes, the same shape the picker returns.
				this.send.add((await Describe(ev.data ?? [])) ?? [])
			}),
			Events.On('croc:code', (ev: { data: string }) => {
				this.send.code = ev.data
				this.send.status = 'waiting'
			}),
			Events.On('croc:send:progress', (ev: { data: TransferStats }) => {
				// Progress only makes sense once the code phrase exists — never
				// let a stray progress line hide the code screen.
				if (this.send.status === 'waiting' || this.send.status === 'sending') {
					this.send.stats = ev.data
					this.send.progress = ev.data.percent
					this.send.status = 'sending'
				}
			}),
			Events.On('croc:recv:progress', (ev: { data: TransferStats }) => {
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
			Events.On('croc:received', (ev: { data: string }) => {
				this.receive.complete(ev.data)
			}),
			Events.On('croc:error', (ev: { data: string }) => {
				this.error = ev.data
				if (this.send.status !== 'done') this.send.status = 'idle'
				if (this.receive.status !== 'done') this.receive.stop()
			})
		]
		return () => unsubs.forEach((unsub) => unsub())
	}
}

export const app = new TransferApp()
