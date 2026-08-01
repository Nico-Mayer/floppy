export type SendStatus = 'idle' | 'starting' | 'waiting' | 'sending' | 'cancelling' | 'done'

/**
 * Who a send is aimed at, decided before it starts and fixed for its lifetime.
 *
 * The two flows share every status but mean different things in the middle:
 * a `code` send publishes a phrase and waits for *anyone* to bring it, while a
 * `device` send pushes an offer to one trusted peer and waits for it to accept.
 * A device send therefore never shows the code — it is derived from the pairing
 * keys, and putting it on screen would hand out a second way in.
 */
export type SendTarget = { kind: 'code' } | { kind: 'device'; fingerprint: string; name: string }

/**
 * Where a receive came from, decided before it starts and fixed for its lifetime.
 *
 * A `code` receive is the user typing a phrase and going looking for a peer; a
 * `device` receive is an offer that was already accepted, so the sender is known
 * and so is what it is bringing. The panel says who and what instead of asking
 * about a code that was never entered.
 */
export type ReceiveTarget =
	{ kind: 'code' } | { kind: 'device'; name: string; fileCount: number; totalBytes: number }
export type ReceiveStatus = 'idle' | 'connecting' | 'receiving' | 'cancelling' | 'done'
export type Accent = 'send' | 'receive'
