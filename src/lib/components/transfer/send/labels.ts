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

/**
 * The aside that appears once a trusted send has waited too long (the wait itself
 * is NO_ANSWER_HINT_DELAY, in transfer-app.svelte.ts). Just the thing to check:
 * the label above it already says who we are waiting for, so saying "no answer
 * yet" here would only be that line again.
 */
export const NO_ANSWER_HINT = 'make sure Floppy is open over there'

/**
 * The one line under the mark on a device send: who this is with. The mark says
 * which state we are in (spinner while we wait, check once they say yes), so the
 * label never repeats it and never explains the pairing model.
 */
export function sendConnectLabel(accepted: boolean, name: string): string {
	return accepted ? `connecting to ${name}` : `waiting for ${name}`
}

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
