import type { TransferStats } from '$bindings/floppy/models'

/** Decimal byte sizes, matching what croc itself reports. */
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

export function formatRate(bytesPerSecond: number): string {
	return `${formatBytes(bytesPerSecond)}/s`
}

/**
 * What is moving right now: "photo.jpg", or "photo.jpg · 2 of 5" when there is
 * more than one file. Empty until croc reports a manifest, which for a
 * receiver is the first thing it learns about the transfer at all.
 */
export function currentFile(stats: TransferStats | null): string {
	if (!stats?.file) return ''
	if (stats.fileCount < 2) return stats.file
	return `${stats.file} · ${stats.fileIndex} of ${stats.fileCount}`
}

/** Coarse duration for an ETA — seconds below a minute, then rounded. */
export function formatDuration(seconds: number): string {
	if (seconds < 60) return `${Math.max(seconds, 0)}s`
	const minutes = Math.round(seconds / 60)
	if (minutes < 60) return `${minutes}m`
	const hours = Math.floor(minutes / 60)
	return `${hours}h ${minutes % 60}m`
}
