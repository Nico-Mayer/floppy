import type { SendStatus, SendTarget } from '../types'

/**
 * The send panel's state table, in one place.
 *
 * Every screen is a cell of (status × target): the statuses come from the core and
 * the pairing layer, and the target decides what two of them *mean* — see
 * SendTarget. Reading the flows top to bottom:
 *
 *   code:   idle → starting (core serving) → waiting (phrase is up, anyone may
 *           bring it) → sending → done
 *   device: idle → starting (offered, peer has not answered) → waiting (peer
 *           accepted, transfer connecting) → sending → done
 *
 * Cancelling can interrupt any of the middle three and lands back on idle with
 * the queue intact.
 */

/** Lowercase status line in the top bar: what is happening right now. */
export function sendHeadline(status: SendStatus, target: SendTarget, fileCount: number): string {
	switch (status) {
		case 'cancelling':
			return 'stopping'
		case 'starting':
			return target.kind === 'device' ? 'waiting for a yes' : 'connecting'
		case 'waiting':
			return target.kind === 'device' ? 'connecting' : 'waiting for pickup'
		case 'sending':
			return 'sending'
		case 'done':
			return 'all done'
		default:
			return fileCount ? 'ready to send' : 'pick your files'
	}
}
