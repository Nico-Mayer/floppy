import type { SendStatus, SendTarget } from '../types'
import { formatBytes } from '../format'

/**
 * The send panel's state table, in one place.
 *
 * Every screen is a cell of (status × target): the statuses come from croc and
 * the pairing layer, and the target decides what two of them *mean* — see
 * SendTarget. Reading the flows top to bottom:
 *
 *   code:   idle → starting (croc booting) → waiting (phrase is up, anyone may
 *           bring it) → sending → done
 *   device: idle → starting (offered, peer has not answered) → waiting (peer
 *           accepted, croc connecting) → sending → done
 *
 * Cancelling can interrupt any of the middle three and lands back on idle with
 * the queue intact.
 */

/** Lowercase line under the card title: what is happening right now. */
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

/** Badge in the card's top-right corner: the state at a glance. */
export function sendBadge(
	status: SendStatus,
	target: SendTarget,
	files: { count: number; totalSize: number },
	progress: number
): string {
	switch (status) {
		case 'cancelling':
			return 'stopping'
		case 'starting':
			return target.kind === 'device' ? 'asked' : 'setting up'
		case 'waiting':
			return target.kind === 'device' ? 'accepted' : 'ready'
		case 'sending':
			return `${progress}%`
		case 'done':
			return 'sent'
		default:
			return files.count ? formatBytes(files.totalSize) : 'nothing yet'
	}
}
