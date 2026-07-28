import type { DeviceInfo, PairingOfferEvent, PairingPreview } from '$bindings/floppy/internal/services/models'
import {
	Accept,
	Decline,
	Identity,
	PreviewPairing,
	SendTo,
	Trust,
	TrustedDevices,
	Untrust
} from '$bindings/floppy/internal/services/pairingservice'
import { Events } from '@wailsio/runtime'
import { app } from './transfer-app.svelte'

type Toast = { kind: 'info' | 'error'; message: string }

/**
 * Frontend state for trusted devices. Mirrors the transfer-app pattern: a
 * single $state class, event subscriptions wired in init(), all Go calls
 * funnelled through here. The backend owns every secret — this only ever holds
 * public identities, fingerprints, and the SAS for the compare step.
 */
class PairingApp {
	/** This device's encoded public identity (for the QR / copy). */
	identity = $state('')
	devices = $state<DeviceInfo[]>([])
	/** A verified incoming offer awaiting the user's accept/decline. */
	incoming = $state<PairingOfferEvent | null>(null)
	/** Transient status line for accepted/declined/error outcomes. */
	toast = $state<Toast | null>(null)

	/** Whether the pairing backend came up (broker reachable, identity loaded). */
	get available() {
		return this.identity !== ''
	}

	/** Subscribe to pairing events; returns the cleanup for onMount. */
	async init() {
		try {
			this.identity = await Identity()
			await this.refresh()
		} catch {
			// Pairing unavailable (service not started) — the panel shows a hint.
		}
		const unsubs = [
			Events.On('pairing:offer', (ev) => (this.incoming = ev.data)),
			Events.On('pairing:accepted', () => {
				// On the sender the croc:code/progress events take the send panel
				// from here; nothing to do but clear a lingering incoming prompt.
				this.incoming = null
				this.#say('info', 'Transfer accepted')
			}),
			Events.On('pairing:declined', () => {
				this.#resetPendingSend()
				this.#say('info', 'Offer declined')
			}),
			Events.On('pairing:error', (ev) => {
				this.#resetPendingSend()
				this.#say('error', ev.data.message)
			})
		]
		return () => unsubs.forEach((unsub) => unsub())
	}

	async refresh() {
		this.devices = (await TrustedDevices()) ?? []
	}

	async accept() {
		if (!this.incoming) return
		const id = this.incoming.transferId
		this.incoming = null
		// Switch to the receive view and show it connecting — the transfer's
		// progress and completion land there once the sender starts.
		app.mode = 'receive'
		app.receive.beginTrusted()
		try {
			await Accept(id)
		} catch (e) {
			app.receive.stop()
			this.#say('error', String(e))
		}
	}

	async decline() {
		if (!this.incoming) return
		const id = this.incoming.transferId
		this.incoming = null
		try {
			await Decline(id)
		} catch (e) {
			this.#say('error', String(e))
		}
	}

	/**
	 * Offer already-selected files to a trusted device. The send panel enters
	 * its connecting state immediately; the actual croc send begins once the
	 * peer accepts (driven by croc:code/progress), or is unwound on decline.
	 */
	async sendTo(fingerprint: string, paths: string[]) {
		if (!paths.length) return
		app.error = null
		app.mode = 'send'
		app.send.beginTrusted()
		try {
			await SendTo(fingerprint, paths)
			this.#say('info', 'Waiting for the device to accept…')
		} catch (e) {
			app.send.reset()
			this.#say('error', String(e))
		}
	}

	/** Decode a pasted identity and get its fingerprint + SAS for the compare. */
	preview(encoded: string): Promise<PairingPreview> {
		return PreviewPairing(encoded)
	}

	async trust(encoded: string, name: string) {
		await Trust(encoded, name)
		await this.refresh()
	}

	async untrust(fingerprint: string) {
		await Untrust(fingerprint)
		await this.refresh()
	}

	dismissToast() {
		this.toast = null
	}

	#say(kind: Toast['kind'], message: string) {
		this.toast = { kind, message }
	}

	// A trusted send that never got past "connecting" (declined, or failed
	// before croc started) must release the send panel. Once croc is actually
	// moving bytes, its own events own the panel and this leaves them alone.
	#resetPendingSend() {
		if (app.send.status === 'starting') app.send.reset()
	}
}

export const pairing = new PairingApp()
