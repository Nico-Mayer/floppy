// The `floppy://` links the app's QRs carry, and how a scanned string is read
// back.
//
// Both codes in the app come from the same generator, so `1234-red-fox-moon` is a
// valid transfer code *and* a valid pairing code and nothing about the string says
// which. The QRs therefore encode a link — one word apart, `receive` or `pair` —
// so a scan knows what it just read, and so a reader outside the app has something
// it can act on at all.
//
// Parsing lives here as well as in `route_deep_link` (src-tauri/src/lib.rs),
// because the scanner decodes locally and putting an IPC round trip inside a
// camera loop to re-derive what a regex already knows would be silly. Same
// arrangement as `code.ts` and `code::normalize`: two small mirrors of one
// format, the Rust half unit-tested.

import { CODE_PATTERN, sanitizeCodeInput } from './code'

/** Which flow a scanned or opened code belongs to. */
export type CodeKind = 'receive' | 'pair'

/**
 * What a scan turned out to be. `bare` is a code with no link around it: legal
 * everywhere, and it means whatever the surface the user scanned from means.
 */
export type Scanned = { kind: CodeKind | 'bare'; code: string }

/** The link the Send panel's QR carries. */
export function receiveLink(code: string): string {
	return `floppy://receive?code=${code}`
}

/** The link the pairing QR carries. */
export function pairLink(code: string): string {
	return `floppy://pair?code=${code}`
}

/**
 * Read scanned content: one of our links, a bare code, or nothing we know.
 *
 * `null` for anything else — a wifi QR, a URL, a poster — so a caller can say
 * "that is not a Floppy code" instead of spending a round trip finding out. The
 * code inside a link is checked against the same pattern a typed one is, so a
 * well-formed wrapper around junk is still nothing.
 */
export function parseScanned(content: string): Scanned | null {
	const text = content.trim()
	// Through the same sanitiser a typed code goes through, so a code that travelled
	// as a form-encoded query (`1234+red+fox+moon`) reads the same here as it does
	// coming out of `route_deep_link`, and anything shaped like a code but not one is
	// refused rather than sent to a command.
	const code = (raw: string) => {
		const value = sanitizeCodeInput(raw)
		return CODE_PATTERN.test(value) ? value : null
	}

	const link = /^floppy:\/\/(receive|pair)\/?\?(.*)$/i.exec(text)
	if (link) {
		const kind = link[1].toLowerCase() as CodeKind
		const param = link[2].split('&').find((p) => p.startsWith('code='))
		const value = param && code(param.slice('code='.length))
		return value ? { kind, code: value } : null
	}

	const bare = code(text)
	return bare ? { kind: 'bare', code: bare } : null
}
