import type { ProgressEvent } from '$lib/ipc'

/** Decimal byte sizes, matching `format_bytes` in the core (lib.rs). */
export function formatBytes(bytes: number): string {
	if (bytes < 1000) return `${Math.max(bytes, 0)} B`
	const units = ['kB', 'MB', 'GB', 'TB']
	let value = bytes / 1000
	let unit = 0
	while (value >= 1000 && unit < units.length - 1) {
		value /= 1000
		unit++
	}
	return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

/** How many characters of a filename a status line shows before it is cut. */
const NAME_LIMIT = 24
/** How much of the end survives the cut, so the extension is always readable. */
const NAME_TAIL = 8

/**
 * A file's own name, cut to a length the layout can always hold.
 *
 * Two defences in one, because a name reaches the screen from four pickers on
 * three platforms:
 *
 * - Anything up to the last separator is dropped. Every path the core sends is
 *   already a bare name (it takes `file_name()` on the way in), but a platform
 *   that hands back a URI-shaped display name would otherwise put a path on the
 *   status line, and that is not worth trusting the whole chain for.
 * - Past `NAME_LIMIT` the middle is elided rather than the end, so "the long one"
 *   and "the long one, final cut" stay tellable apart and `.mp4` survives. A
 *   character cap, not just CSS truncation: it holds whatever the container
 *   does, and the line cannot be the thing that decides the layout's width.
 */
export function fileLabel(name: string): string {
	const base = name.slice(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1)
	if (base.length <= NAME_LIMIT) return base
	return `${base.slice(0, NAME_LIMIT - NAME_TAIL - 1)}…${base.slice(-NAME_TAIL)}`
}

/**
 * What is moving right now: "photo.jpg", or "photo.jpg · 2 of 5" when there is
 * more than one file. Empty until the core reports a manifest, which for a
 * receiver is the first thing it learns about the transfer at all.
 */
export function currentFile(stats: ProgressEvent | null): string {
	if (!stats?.file) return ''
	const name = fileLabel(stats.file)
	if (stats.fileCount < 2) return name
	return `${name} · ${stats.fileIndex} of ${stats.fileCount}`
}
