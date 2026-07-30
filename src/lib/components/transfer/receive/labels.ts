import type { ReceiveStatus, ReceiveTarget } from '../types'

/**
 * The receive panel's state table, in one place — the mirror of ../send/labels.ts.
 *
 * Every screen is a cell of (status × target): the statuses come from croc and
 * the pairing layer, and the target decides what 'connecting' *means* — see
 * ReceiveTarget. Reading the flows top to bottom:
 *
 *   code:   idle (enter a phrase) → connecting (hunting for the peer; after
 *           15s it admits the code may be wrong) → receiving → done
 *   device: connecting (offer accepted, sender is getting croc up) → receiving
 *           → done. There is no idle: the flow starts from the offer prompt.
 *
 * Cancelling can interrupt connecting or receiving and lands back on idle with
 * the code intact — the usual reason to cancel is a typo in it.
 */

/** Lowercase line under the card title: what is happening right now. */
export function receiveHeadline(status: ReceiveStatus, target: ReceiveTarget): string {
	switch (status) {
		case 'cancelling':
			return 'stopping'
		case 'connecting':
			return target.kind === 'device' ? 'incoming' : 'connecting'
		case 'receiving':
			return 'getting files'
		case 'done':
			return 'all done'
		default:
			return 'type your code'
	}
}

/** Badge in the card's top-right corner: the state at a glance. */
export function receiveBadge(status: ReceiveStatus, target: ReceiveTarget, progress: number | null): string {
	switch (status) {
		case 'cancelling':
			return 'stopping'
		case 'connecting':
			return target.kind === 'device' ? 'accepted' : '…'
		case 'receiving':
			// A receiver has no byte counts until the sender's manifest lands.
			return progress === null ? '…' : `${progress}%`
		case 'done':
			return 'done'
		default:
			return 'waiting'
	}
}

/** "3 files" / "1 file" — a count with the right plural. */
export function fileCount(n: number): string {
	return `${n} ${n === 1 ? 'file' : 'files'}`
}
