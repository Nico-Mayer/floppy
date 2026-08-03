import { HealthNow, events, type HealthEvent, type Link } from '$lib/ipc'

/**
 * Connectivity health: the state of the two links a transfer leans on, and the
 * one line to show when either is missing. The core owns the truth (it watches
 * both passively) and reports the whole state on every change, so this only ever
 * replaces its copy — it never reasons about what changed.
 *
 * `unknown` is the launch state and means nothing is shown. It is not bad news: a
 * cold start has no relay for a second or two by design.
 *
 * This warns and nothing more. Every transfer control stays live while a link is
 * down, because two devices on one network transfer fine without one, and a real
 * failure still reports itself through the transfer error surfaces.
 */
class HealthApp {
	/** Whether the app can reach the wider internet (iroh's relay). */
	relay = $state<Link>('unknown')
	/** Whether this device is registered for codes and saved devices. */
	broker = $state<Link>('unknown')

	/** Whether there is anything worth saying. */
	get warning() {
		return this.relay === 'down' || this.broker === 'down'
	}

	/**
	 * What to say about it: what is wrong and the one thing to try. Where
	 * something still works despite the failure, it says so rather than implying
	 * nothing will.
	 */
	get message() {
		if (this.relay === 'down' && this.broker === 'down') {
			return 'No connection right now. Check your wifi, or turn off your VPN.'
		}
		if (this.relay === 'down') {
			return "Floppy can't reach the internet. A VPN or firewall is the usual cause. Sending to a device on the same wifi can still work."
		}
		return "Codes and saved devices need a connection, and we don't have one yet. Still trying."
	}

	/**
	 * Subscribe, then fill in from the snapshot; returns the cleanup for onMount.
	 * Both halves of that order are load-bearing. The subscription is awaited
	 * before the read, because listening resolves asynchronously and a change in
	 * that gap would be lost. And a snapshot that lands after an event has already
	 * spoken is the older answer, so it is dropped rather than applied.
	 */
	async init() {
		let reported = false
		let unlisten: (() => void) | undefined
		try {
			unlisten = await events.healthEvent.listen((e) => {
				reported = true
				this.apply(e.payload)
			})
			const now = await HealthNow()
			if (!reported) this.apply(now)
		} catch {
			// No core to talk to (the browser preview has no bridge): stay unknown,
			// which shows nothing.
		}
		return () => unlisten?.()
	}

	private apply(state: HealthEvent) {
		this.relay = state.relay
		this.broker = state.broker
	}
}

export const health = new HealthApp()
