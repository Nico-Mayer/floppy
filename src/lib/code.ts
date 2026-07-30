// The shared `1234-word-word-word` code format, used both for quick-share
// transfers and for pairing (see src-tauri/src/rendezvous/code.rs). One place so
// the receive form and the Devices page agree on what a code looks like.

/** A complete, well-formed code: leading digits then three lowercase words. */
export const CODE_PATTERN = /^\d+-[a-z]+-[a-z]+-[a-z]+$/

/** Whether `value` is a complete code (used to gate the submit button). */
export function isCompleteCode(value: string): boolean {
	return CODE_PATTERN.test(value.trim())
}

/**
 * Keep an in-progress code to characters a real code can contain: lowercase it,
 * turn any run of spaces or stray characters into a single hyphen, and drop a
 * leading hyphen. A trailing hyphen is kept so the next word can be typed. This
 * mirrors the backend's `code::normalize`, so unsupported input never reaches a
 * command.
 */
export function sanitizeCodeInput(raw: string): string {
	return raw
		.toLowerCase()
		.replace(/[^0-9a-z-]+/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-/, '')
}
