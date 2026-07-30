import {
	Accept,
	ConfirmPair,
	Decline,
	DismissPair,
	Identity,
	PreviewPairing,
	RedeemPairCode,
	RenameDevice,
	SelfName,
	SendTo,
	SetSelfName,
	ShowPairCode,
	Trust,
	TrustedDevices,
	Untrust,
	events,
	type DeviceInfo,
	type PairingOfferEvent,
	type PairingPreview,
	type PairingRequest
} from '$lib/ipc'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { toast } from 'svelte-sonner'
import { app } from './transfer-app.svelte'

/**
 * Frontend state for trusted devices. Mirrors the transfer-app pattern: a
 * single $state class, event subscriptions wired in init(), all Go calls
 * funnelled through here. The backend owns every secret — this only ever holds
 * public identities, fingerprints, and the SAS for the compare step.
 */
class PairingApp {
	/** This device's encoded public identity (used internally for pairing). */
	identity = $state('')
	/** This device's own name, shown to peers and editable on the Devices page. */
	selfName = $state('')
	devices = $state<DeviceInfo[]>([])
	/** A verified incoming offer awaiting the user's accept/decline. */
	incoming = $state<PairingOfferEvent | null>(null)
	/** A device that paired against our link, awaiting our confirm-and-name. */
	request = $state<PairingRequest | null>(null)

	/** Whether the pairing backend came up (broker reachable, identity loaded). */
	get available() {
		return this.identity !== ''
	}

	/** Subscribe to pairing events; returns the cleanup for onMount. */
	async init() {
		try {
			this.identity = await Identity()
			this.selfName = await SelfName()
			await this.refresh()
		} catch {
			// Pairing unavailable (service not started) — the panel shows a hint.
		}
		const subs = [
			events.pairingOfferEvent.listen((e) => (this.incoming = e.payload)),
			events.pairingAccepted.listen(() => {
				// Move the send panel off "waiting for a yes" into the accepted state;
				// progress events then carry it to sending/done. Route to the transfer
				// panel so the progress it drives is actually on screen. Also clear any
				// lingering incoming prompt.
				app.send.accepted()
				this.incoming = null
				void goto(resolve('/'))
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
			// A device paired against a link we are showing: hold it for the
			// confirm-and-name prompt, and bring the pair page up behind it so the
			// confirm has its context.
			events.pairingRequest.listen((e) => {
				this.request = e.payload
				void goto(resolve('/devices'))
			}),
			// A pairing completed on this device (either side): show it on the
			// Devices page, where the new device now appears.
			events.pairingPaired.listen((e) => {
				void this.refresh()
				void goto(resolve('/devices'))
				toast.success(`Paired with ${e.payload.name}`)
			})
		]
		return () => subs.forEach((sub) => sub.then((unlisten) => unlisten()))
	}

	async refresh() {
		this.devices = (await TrustedDevices()) ?? []
	}

	/**
	 * Show a pairing code (also rendered as a QR) for another device to redeem.
	 * A fresh call shows a new code; the old one expires on its own.
	 */
	showCode(): Promise<string> {
		return ShowPairCode()
	}

	/**
	 * Redeem a code shown on another device. `via` is 'qr' when scanned or 'code'
	 * when typed. Resolves once the other device confirms; the `pairing:paired`
	 * event then refreshes the list and toasts. Rejects so the caller can show the
	 * linking state ending.
	 */
	async redeemCode(code: string, via: 'qr' | 'code') {
		await RedeemPairCode(code, via)
	}

	/** Rename this device. The new name is advertised to peers from now on. */
	async setSelfName(name: string) {
		const next = name.trim()
		if (!next) return
		try {
			await SetSelfName(next)
			this.selfName = next
		} catch (e) {
			toast.error(`Could not rename this device: ${e}`)
		}
	}

	async accept() {
		if (!this.incoming) return
		const offer = this.incoming
		this.incoming = null
		// Switch to the receive view and show it connecting — the transfer's
		// progress and completion land there once the sender starts. Route to the
		// transfer panel too, since the prompt can be accepted from any page. The
		// offer travels with it so the panel can say who is sending, and what.
		app.mode = 'receive'
		void goto(resolve('/'))
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
	 * Approve a device that paired against our link, trusting it under `name`.
	 * The pairing:paired event refreshes the list and toasts; clear the prompt.
	 */
	async confirmPair(name: string) {
		const req = this.request
		if (!req) return
		this.request = null
		try {
			await ConfirmPair(req.fingerprint, name)
		} catch (e) {
			toast.error(`Could not add that device: ${e}`)
		}
	}

	/** Turn down a device that paired against our link. */
	async dismissPair() {
		const req = this.request
		if (!req) return
		this.request = null
		try {
			await DismissPair(req.fingerprint)
		} catch {
			// Best-effort: the request is already gone from the UI either way.
		}
	}

	/** Rename a trusted device. Refresh either way so the list matches the store. */
	async rename(fingerprint: string, name: string) {
		try {
			await RenameDevice(fingerprint, name)
		} catch (e) {
			toast.error(`Could not rename that device: ${e}`)
		}
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
