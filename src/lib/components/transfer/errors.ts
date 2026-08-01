/**
 * Turning raw error text into something a person can act on.
 *
 * Two sources feed in: rejected binding calls (the Go sentinel errors, whose
 * message text is a deliberate contract — see internal/transfer/errors.go)
 * and croc:error events (croc's own wording, which we do not control). Both
 * arrive as strings, so the mapping is prefix/substring based; anything
 * unrecognised falls through with its original text intact.
 */

export type AppError = {
	/** Short headline: what failed. */
	title: string
	/** One sentence the user can act on. */
	message: string
	/** The original text, kept for the tooltip when we replaced it. */
	detail?: string
}

type Rule = {
	match: RegExp
	title: string
	message: string
}

// Order matters: first match wins.
const RULES: Rule[] = [
	// --- Go sentinels (internal/transfer/errors.go). Stable by contract. ---
	{
		match: /no files selected/i,
		title: 'Nothing to send',
		message: 'Pick at least one file first.'
	},
	{
		match: /transfer already running/i,
		title: 'One at a time',
		message: 'Stop the transfer that is running, then start this one.'
	},
	{
		match: /previous transfer still stopping/i,
		title: 'Hang on a second',
		message: 'The last transfer is still wrapping up. Try again in a moment.'
	},
	{
		match: /invalid code phrase/i,
		title: 'That code looks off',
		message: 'Codes look like 4821-mirror-tundra-basil. Give yours another look.'
	},
	// --- croc's own errors. Wording is croc's, so match loosely. ---
	{
		match: /could not connect|i\/o timeout|no such host|connection refused|dial tcp/i,
		title: 'No connection',
		message: 'Check your internet, then try again.'
	},
	{
		match: /refusing files|transfer disconnected|connection reset|broken pipe|EOF/i,
		title: 'The other device dropped out',
		message:
			'Someone hit cancel, or the connection broke. Whatever arrived is saved, so the same code picks up where it stopped.'
	},
	{
		match: /incorrect password|pake|failed to authenticate|bad key/i,
		title: 'The codes do not match',
		message: 'That is not the code the sender has. Check it and try again.'
	},
	{
		match: /no space left|disk full/i,
		title: 'No space left',
		message: 'Free up some room, then start again.'
	},
	{
		match: /permission denied|access is denied/i,
		title: 'Cannot save there',
		message: 'Floppy is not allowed to write to that folder. Check its permissions.'
	}
]

/** Fallback headline when nothing matches, based on which side failed. */
function fallbackTitle(kind?: string): string {
	if (kind === 'send') return 'Could not send'
	if (kind === 'receive') return 'Could not receive'
	return 'Something went wrong'
}

/**
 * describeError maps raw error text to a headline plus an actionable line.
 * `kind` is the transfer direction when known ('send' | 'receive'), used only
 * for the fallback headline.
 */
export function describeError(raw: string, kind?: string): AppError {
	// Binding rejections stringify as "Error: <message>"; the prefix is noise.
	const text = raw.replace(/^Error:\s*/i, '').trim()
	if (!text) return { title: fallbackTitle(kind), message: 'No details came back with it.' }

	for (const rule of RULES) {
		if (rule.match.test(text)) {
			return { title: rule.title, message: rule.message, detail: text }
		}
	}
	// Unrecognised: show it verbatim rather than inventing an explanation.
	return { title: fallbackTitle(kind), message: text }
}
