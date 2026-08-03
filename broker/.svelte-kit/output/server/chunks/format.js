//#region src/lib/components/transfer/format.ts
/** Decimal byte sizes, matching `format_bytes` in the core (lib.rs). */
function formatBytes(bytes) {
	if (bytes < 1e3) return `${Math.max(bytes, 0)} B`;
	const units = [
		"kB",
		"MB",
		"GB",
		"TB"
	];
	let value = bytes / 1e3;
	let unit = 0;
	while (value >= 1e3 && unit < units.length - 1) {
		value /= 1e3;
		unit++;
	}
	return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
function formatRate(bytesPerSecond) {
	return `${formatBytes(bytesPerSecond)}/s`;
}
/**
* What is moving right now: "photo.jpg", or "photo.jpg · 2 of 5" when there is
* more than one file. Empty until the core reports a manifest, which for a
* receiver is the first thing it learns about the transfer at all.
*/
function currentFile(stats) {
	if (!stats?.file) return "";
	if (stats.fileCount < 2) return stats.file;
	return `${stats.file} · ${stats.fileIndex} of ${stats.fileCount}`;
}
/** Coarse duration for an ETA — seconds below a minute, then rounded. */
function formatDuration(seconds) {
	if (seconds < 60) return `${Math.max(seconds, 0)}s`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
//#endregion
export { formatRate as i, formatBytes as n, formatDuration as r, currentFile as t };
