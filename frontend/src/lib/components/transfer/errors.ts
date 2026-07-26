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
		message: 'Add at least one file before starting a transfer.'
	},
	{
		match: /transfer already running/i,
		title: 'Already running',
		message: 'Cancel the transfer in progress before starting another one.'
	},
	{
		match: /previous transfer still stopping/i,
		title: 'Still stopping',
		message: 'The last transfer has not finished stopping yet. Try again in a moment.'
	},
	{
		match: /invalid code phrase/i,
		title: 'Check the code',
		message: 'Transfer codes are at least 6 characters, like 4821-mirror-tundra-basil.'
	},
	// --- croc's own errors. Wording is croc's, so match loosely. ---
	{
		match: /could not connect|i\/o timeout|no such host|connection refused|dial tcp/i,
		title: 'Could not reach the relay',
		message: 'Check your internet connection, then try again.'
	},
	{
		match: /refusing files|transfer disconnected|connection reset|broken pipe|EOF/i,
		title: 'The other device stopped',
		message:
			'The transfer was cancelled or the connection dropped. Partly received files are kept, so the same code resumes where it left off.'
	},
	{
		match: /incorrect password|pake|failed to authenticate|bad key/i,
		title: 'Codes did not match',
		message: 'That code does not match the sender. Check it and try again.'
	},
	{
		match: /no space left|disk full/i,
		title: 'Out of disk space',
		message: 'Free up some space and start the transfer again.'
	},
	{
		match: /permission denied|access is denied/i,
		title: 'Permission denied',
		message: 'The app is not allowed to write there. Check the folder’s permissions.'
	}
]

/** Fallback headline when nothing matches, based on which side failed. */
function fallbackTitle(kind?: string): string {
	if (kind === 'send') return 'Send failed'
	if (kind === 'receive') return 'Receive failed'
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
	if (!text) return { title: fallbackTitle(kind), message: 'No further detail was reported.' }

	for (const rule of RULES) {
		if (rule.match.test(text)) {
			return { title: rule.title, message: rule.message, detail: text }
		}
	}
	// Unrecognised: show it verbatim rather than inventing an explanation.
	return { title: fallbackTitle(kind), message: text }
}
