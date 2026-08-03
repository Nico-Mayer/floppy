import {
	Accept,
	ConfirmPair,
	Decline,
	DismissPair,
	Identity,
	RedeemPairCode,
	RenameDevice,
	SelfName,
	SendTo,
	SetSelfName,
	ShowPairCode,
	TrustedDevices,
	Untrust,
	events,
	type DeviceInfo,
	type PairCode,
	type PairingOfferEvent,
	type PairingRequest
} from '$lib/ipc'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { SvelteSet } from 'svelte/reactivity'
import { toast } from 'svelte-sonner'
import { describeError, errorText } from './errors'
import { haptics } from './haptics'
import { sounds } from './sounds'
import { app } from './transfer-app.svelte'

/**
 * Frontend state for trusted devices. Mirrors the transfer-app pattern: a
 * single $state class, event subscriptions wired in init(), all core calls
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
	/** A device that redeemed a code we are showing, awaiting our confirm. */
	request = $state<PairingRequest | null>(null)
	/**
	 * How many pairings have completed on this device this session. Only ever read
	 * as a signal that one just did — a count rather than a flag so a surface can
	 * tell "another one happened" from "the same one is still the latest", which a
	 * boolean cannot say without someone having to reset it.
	 */
	paired = $state(0)
	/**
	 * Whether the first device-list load has settled, success or not. Until it
	 * has, an empty list means "still loading", and the Devices page shows
	 * placeholder rows rather than the empty state.
	 */
	loaded = $state(false)
	/**
	 * A code from a `floppy://pair` link, waiting to be put in the code field.
	 *
	 * The link is never redeemed by arriving: it fills the field and a person
	 * presses, and it is then redeemed as a typed code so the SAS compare still
	 * happens. A link can be forwarded or pasted anywhere, so it is not the proof of
	 * being in the same room that lets a scan skip that compare. The Devices page
	 * takes it and clears it (see DeviceList).
	 */
	pendingCode = $state('')

	/**
	 * Device actions currently in flight, keyed `action:fingerprint` (`confirm`
	 * and `rename:self` stand alone). Held here rather than in a component
	 * because a row, a dialog, and a panel can each start the same action, and
	 * the state must survive any one of them closing (`feedback`).
	 */
	#pending = new SvelteSet<string>()

	/** Whether a device action is still running, wherever it was started. */
	isPending(key: string) {
		return this.#pending.has(key)
	}

	async #track<T>(key: string, work: () => Promise<T>): Promise<T> {
		this.#pending.add(key)
		try {
			return await work()
		} finally {
			this.#pending.delete(key)
		}
	}

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
		} finally {
			this.loaded = true
		}
		const subs = [
			events.pairingOfferEvent.listen((e) => {
				this.incoming = e.payload
				// Something arrived that waits on an answer. Fire and forget, and only
				// in the foreground: backgrounded, the OS notification is the alert.
				void haptics.arrived()
				sounds.arrived()
			}),
			events.pairingAccepted.listen(() => {
				// Move the send panel off "waiting for a yes" into the accepted state;
				// progress events then carry it to sending/done. Route to Send so the
				// progress it drives is actually on screen. Also clear any lingering
				// incoming prompt. The panel visibly progressing is the "yes"; no toast.
				app.send.accepted()
				this.incoming = null
				void haptics.peerAccepted()
				void goto(resolve('/send'))
			}),
			events.pairingRevoked.listen((e) => {
				// The sender pulled the offer back: drop the prompt if it is the one
				// on screen. An id we are not showing (already answered, or a prompt
				// that expired on its own) changes nothing.
				if (this.incoming?.transferId !== e.payload.transferId) return
				this.incoming = null
				toast.info('They stopped the send')
			}),
			events.pairingDeclined.listen((e) => {
				this.#resetPendingSend()
				void haptics.failed()
				toast.info(e.payload.busy ? "They're busy. Try again in a bit." : 'They turned it down')
			}),
			events.pairingError.listen((e) => {
				// A failure while a trusted send is still waiting on a yes is that
				// send failing: it reports inline in the Send panel, where the user
				// is already watching (`feedback`). Anything else is background news
				// and toasts.
				void haptics.failed()
				if (app.send.status === 'starting') {
					app.send.stop()
					app.send.error = { title: 'Could not send', message: e.payload.message }
				} else {
					toast.error(e.payload.message)
				}
			}),
			// A device redeemed a code we are showing: hold it for the confirm
			// prompt, and bring the Devices page up behind it for context.
			events.pairingRequest.listen((e) => {
				this.request = e.payload
				void haptics.arrived()
				sounds.arrived()
				void goto(resolve('/devices'))
			}),
			// A floppy://pair?code=… link opened the app: bring up Devices with the code
			// in the field, and redeem nothing. The transfer app listens to this same
			// event for the receive kind; the kinds are exclusive, so each side takes
			// its own and ignores the other.
			events.deepLink.listen((e) => {
				if (e.payload.kind !== 'pair') return
				this.pendingCode = e.payload.code
				void goto(resolve('/devices'))
			}),
			// A pairing completed on this device (either side): show it on the
			// Devices page, where the new device now appears in the list — that
			// arrival is the confirmation, so no toast.
			events.pairingPaired.listen(() => {
				this.paired += 1
				void haptics.paired()
				// The same note a finished transfer plays: both say the thing you were
				// waiting on is done, and pairing has a wait in it you may look away
				// through.
				sounds.paired()
				void this.refresh()
				void goto(resolve('/devices'))
			})
		]
		return () => subs.forEach((sub) => sub.then((unlisten) => unlisten()))
	}

	async refresh() {
		this.devices = (await TrustedDevices()) ?? []
		this.loaded = true
	}

	/**
	 * Show a pairing code (also rendered as a QR) for another device to redeem.
	 * A fresh call shows a new code; the old one expires on its own. The core
	 * returns how long the code lasts with it, so the UI counts down the same
	 * number the core enforces rather than a copy of it.
	 */
	showCode(): Promise<PairCode> {
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
			await this.#track('rename:self', () => SetSelfName(next))
			this.selfName = next
		} catch (e) {
			toast.error(`Could not rename this device: ${errorText(e)}`)
		}
	}

	async accept() {
		if (!this.incoming) return
		const offer = this.incoming
		this.incoming = null
		// Go to Receive and show it connecting — the transfer's progress and
		// completion land there once the sender starts, and the prompt can be
		// accepted from any page. The offer travels with it so the panel can say
		// who is sending, and what.
		void goto(resolve('/receive'))
		app.receive.beginTrusted({
			name: offer.fromName,
			fileCount: offer.fileCount,
			totalBytes: offer.totalBytes
		})
		try {
			await this.#track('accept', () => Accept(offer.transferId))
		} catch (e) {
			// The prompt is gone and the user is watching the Receive panel by
			// now, so the failure lands there rather than as a toast over it.
			app.receive.stop()
			app.receive.error = describeError(e, 'receive')
		}
	}

	async decline() {
		if (!this.incoming) return
		const id = this.incoming.transferId
		this.incoming = null
		try {
			await this.#track('decline', () => Decline(id))
		} catch (e) {
			toast.error(errorText(e))
		}
	}

	/**
	 * Offer already-selected files to a trusted device. The send panel enters
	 * its connecting state immediately; the actual send begins once the peer
	 * accepts (driven by the code/progress events), or is unwound on decline.
	 */
	async sendTo(fingerprint: string, paths: string[]) {
		if (!paths.length) return
		// The panel names the peer while it waits, so resolve it here — the
		// device could be un-trusted mid-transfer and the list would forget it.
		const device = this.devices.find((d) => d.fingerprint === fingerprint)
		if (!device) return
		app.send.error = null
		app.send.beginTrusted({ fingerprint, name: device.name })
		try {
			// No toast here — the send panel already shows the connecting/waiting state.
			await this.#track(`send:${fingerprint}`, () => SendTo(fingerprint, paths))
		} catch (e) {
			// Inline in the Send panel, the same as a code send failing: one screen,
			// one place its failures land, whoever the target was (`feedback`). The
			// queue stays, so trying again once they are back is one tap.
			app.send.stop()
			app.send.error = describeError(e, 'send')
		}
	}

	/**
	 * Approve a device that redeemed our code, trusting it under `name`.
	 * The prompt stays open, its confirm showing the work, until the agreement
	 * settles — the pairing:paired event then refreshes the list.
	 */
	async confirmPair(name: string) {
		const req = this.request
		if (!req || this.isPending('confirm')) return
		try {
			await this.#track('confirm', () => ConfirmPair(req.fingerprint, name))
		} catch (e) {
			toast.error(`Could not add that device: ${errorText(e)}`)
		} finally {
			this.request = null
		}
	}

	/** Turn down a device that redeemed our code. */
	async dismissPair() {
		const req = this.request
		if (!req || this.isPending('confirm')) return
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
			await this.#track(`rename:${fingerprint}`, () => RenameDevice(fingerprint, name))
		} catch (e) {
			toast.error(`Could not rename that device: ${errorText(e)}`)
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
			await this.#track(`untrust:${fingerprint}`, () => Untrust(fingerprint))
		} catch (e) {
			toast.error(`Could not remove that device: ${errorText(e)}`)
		}
		// Refresh either way: on success it drops the row, on failure it restores
		// the one the list already believes is gone.
		await this.refresh()
	}

	// A trusted send that never got past "connecting" (declined, or failed
	// before the transfer started) must release the send panel. The queue is left
	// alone: they said no now, not never. Once it is actually moving bytes, its own
	// events own the panel and this leaves them alone.
	#resetPendingSend() {
		if (app.send.status === 'starting') app.send.stop()
	}
}

export const pairing = new PairingApp()
