import {
	Accept,
	CreatePairLink,
	Decline,
	Identity,
	OpenPairLink,
	PreviewPairing,
	SendTo,
	Trust,
	TrustedDevices,
	Untrust,
	events,
	type DeviceInfo,
	type PairingOfferEvent,
	type PairingPreview
} from '$lib/ipc'
import { toast } from 'svelte-sonner'
import { app } from './transfer-app.svelte'

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
		const subs = [
			events.pairingOfferEvent.listen((e) => (this.incoming = e.payload)),
			events.pairingAccepted.listen(() => {
				// On the sender the code/progress events take the send panel from
				// here; nothing to do but clear a lingering incoming prompt.
				this.incoming = null
				toast.success('They said yes')
			}),
			events.pairingDeclined.listen(() => {
				this.#resetPendingSend()
				toast.info('They turned it down')
			}),
			events.pairingError.listen((e) => {
				this.#resetPendingSend()
				toast.error(e.payload.message)
			}),
			// One-sided pairing completed on this device (either side).
			events.pairingPaired.listen((e) => {
				void this.refresh()
				toast.success(`Paired with ${e.payload.name}`)
			})
		]
		return () => subs.forEach((sub) => sub.then((unlisten) => unlisten()))
	}

	async refresh() {
		this.devices = (await TrustedDevices()) ?? []
	}

	/**
	 * One-sided pairing. `createLink` returns a link to show (text/QR); the other
	 * device passes it to `openLink`, after which both trust each other — the
	 * `pairing:paired` event refreshes the list and toasts on each side.
	 */
	createLink(): Promise<string> {
		return CreatePairLink()
	}

	async openLink(link: string) {
		try {
			await OpenPairLink(link)
		} catch (e) {
			toast.error(`Pairing did not work: ${e}`)
		}
	}

	async accept() {
		if (!this.incoming) return
		const offer = this.incoming
		this.incoming = null
		// Switch to the receive view and show it connecting — the transfer's
		// progress and completion land there once the sender starts. The offer
		// travels with it so the panel can say who is sending, and what.
		app.mode = 'receive'
		app.receive.beginTrusted({
			name: offer.fromName,
			fileCount: offer.fileCount,
			totalBytes: offer.totalBytes
		})
		try {
			await Accept(offer.transferId)
		} catch (e) {
			app.receive.stop()
			toast.error(String(e))
		}
	}

	async decline() {
		if (!this.incoming) return
		const id = this.incoming.transferId
		this.incoming = null
		try {
			await Decline(id)
		} catch (e) {
			toast.error(String(e))
		}
	}

	/**
	 * Offer already-selected files to a trusted device. The send panel enters
	 * its connecting state immediately; the actual croc send begins once the
	 * peer accepts (driven by croc:code/progress), or is unwound on decline.
	 */
	async sendTo(fingerprint: string, paths: string[]) {
		if (!paths.length) return
		// The panel names the peer while it waits, so resolve it here — the
		// device could be un-trusted mid-transfer and the list would forget it.
		const device = this.devices.find((d) => d.fingerprint === fingerprint)
		if (!device) return
		app.error = null
		app.mode = 'send'
		app.send.beginTrusted({ fingerprint, name: device.name })
		try {
			// No toast here — the send panel already shows the connecting/waiting state.
			await SendTo(fingerprint, paths)
		} catch (e) {
			app.send.reset()
			toast.error(String(e))
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

	/**
	 * Un-trust a device. Both halves of the trust store are on disk, so this can
	 * genuinely fail — and it used to fail silently: an unhandled rejection left
	 * the row sitting in the list with nothing said, so the store and the list
	 * disagreed until the next refresh put the device back.
	 */
	async untrust(fingerprint: string) {
		try {
			await Untrust(fingerprint)
		} catch (e) {
			toast.error(`Could not remove that device: ${e}`)
		}
		// Refresh either way: on success it drops the row, on failure it restores
		// the one the list already believes is gone.
		await this.refresh()
	}

	// A trusted send that never got past "connecting" (declined, or failed
	// before croc started) must release the send panel. Once croc is actually
	// moving bytes, its own events own the panel and this leaves them alone.
	#resetPendingSend() {
		if (app.send.status === 'starting') app.send.reset()
	}
}

export const pairing = new PairingApp()
