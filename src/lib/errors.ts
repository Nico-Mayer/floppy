/**
 * Turning a failure into something a person can act on.
 *
 * Everything that fails arrives typed. A rejected command carries a
 * `CommandError` variant (see `ipc/index.ts`), and a mid-transfer failure
 * carries a `TransferErrorCode` on the error event. Both are generated from
 * Rust, so this file branches on discriminants and never on message text —
 * which is what lets error copy be reworded freely on either side.
 *
 * The split of labour: Rust owns the sentence for a mid-transfer failure (it has
 * the detail), this file owns the headline. For a command refusal Rust carries no
 * message at all, so both lines live here.
 */

import type { CommandError, TransferErrorCode } from './ipc/bindings'

/**
 * A rejected command. Thrown by the `ipc` wrappers so every `catch` gets the
 * typed reason, while `String(e)` still reads as a sentence for the toasts that
 * only want text. Lives here rather than in `ipc/` so the copy it needs for
 * `message` does not have to be imported across the two, which would be a cycle.
 */
export class CommandFailure extends Error {
	readonly reason: CommandError

	constructor(reason: CommandError) {
		super(commandErrorSentence(reason))
		this.name = 'CommandFailure'
		this.reason = reason
	}
}

export type AppError = {
	/** Short headline: what failed. */
	title: string
	/** One sentence the user can act on. */
	message: string
	/** The original text, kept for the tooltip when we replaced it. */
	detail?: string
}

/** Headline plus advice for each way a command can refuse to start. */
const COMMAND_COPY: Record<Exclude<CommandError['kind'], 'other'>, AppError> = {
	noFiles: { title: 'Nothing to send', message: 'Pick at least one file first.' },
	busy: {
		title: 'One at a time',
		message: 'Stop the transfer that is running, then start this one.'
	},
	unwinding: {
		title: 'Hang on a second',
		message: 'The last transfer is still wrapping up. Try again in a moment.'
	},
	badCode: {
		title: 'That code looks off',
		message: 'Codes look like 4821-mirror-tundra-basil. Give yours another look.'
	}
}

/** Headline for each class of mid-transfer failure. The sentence comes from Rust. */
const TRANSFER_TITLES: Record<Exclude<TransferErrorCode, 'other'>, string> = {
	connect: 'No connection',
	disconnected: 'The other device dropped out',
	timeout: 'No answer',
	bad_ticket: 'That code looks off',
	storage: 'Cannot save there'
}

/**
 * Rules for text we did not write and cannot classify: OS messages surfaced by
 * an `other` failure (opening a folder, copying a pick into the cache). Short
 * list on purpose. Anything unmatched is shown verbatim rather than explained
 * away.
 */
const TEXT_RULES: { match: RegExp; title: string; message: string }[] = [
	{
		match: /no space left|disk full/i,
		title: 'No space left',
		message: 'Free up some room, then try again.'
	},
	{
		match: /permission denied|access is denied|operation not permitted/i,
		title: 'Not allowed',
		message: 'Floppy is not allowed to touch that file. Check its permissions.'
	}
]

/** Fallback headline when nothing matches, based on which side failed. */
function fallbackTitle(kind?: string): string {
	if (kind === 'send') return 'Could not send'
	if (kind === 'receive') return 'Could not receive'
	return 'Something went wrong'
}

/** The plain sentence for a command refusal, used as the thrown error's message. */
export function commandErrorSentence(reason: CommandError): string {
	return reason.kind === 'other' ? reason.message : COMMAND_COPY[reason.kind].message
}

/** The human text inside any failure, for interpolating into a sentence. */
export function errorText(cause: unknown): string {
	if (cause instanceof CommandFailure) return commandErrorSentence(cause.reason)
	return String(cause)
		.replace(/^Error:\s*/i, '')
		.trim()
}

/**
 * describeError turns a rejected command into a headline plus an actionable
 * line. `kind` is the transfer direction when known ('send' | 'receive'), used
 * only for the fallback headline.
 */
export function describeError(cause: unknown, kind?: string): AppError {
	if (cause instanceof CommandFailure && cause.reason.kind !== 'other') {
		return COMMAND_COPY[cause.reason.kind]
	}
	const text = errorText(cause)
	if (!text) return { title: fallbackTitle(kind), message: 'No details came back with it.' }

	for (const rule of TEXT_RULES) {
		if (rule.match.test(text)) {
			return { title: rule.title, message: rule.message, detail: text }
		}
	}
	// Unrecognised: show it verbatim rather than inventing an explanation.
	return { title: fallbackTitle(kind), message: text }
}

/**
 * describeTransferError turns a mid-transfer failure event into the same shape.
 * The message is Rust's, because only Rust knows what actually broke.
 */
export function describeTransferError(code: TransferErrorCode, message: string, kind?: string): AppError {
	const title = code === 'other' ? fallbackTitle(kind) : TRANSFER_TITLES[code]
	return { title, message: message || 'No details came back with it.' }
}
