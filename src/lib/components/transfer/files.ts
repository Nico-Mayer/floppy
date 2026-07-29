/** Short uppercase extension for the file-row badge, e.g. "PNG". */
export function ext(path: string): string {
	const name = path.split(/[\\/]/).pop() ?? path
	const dot = name.lastIndexOf('.')
	return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : 'FILE'
}

// Image types the webview renders inline as a queue thumbnail. Must stay in
// step with previewExts in internal/services/preview.go (the server-side gate);
// a mismatch just means a request the middleware refuses and the tile keeps its
// glyph, so drift degrades quietly rather than breaking.
const PREVIEW_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico'])

/** Whether this file can be shown as an inline image preview in its tile. */
export function isPreviewable(path: string): boolean {
	const name = path.split(/[\\/]/).pop() ?? path
	const dot = name.lastIndexOf('.')
	return dot > 0 && PREVIEW_EXTS.has(name.slice(dot + 1).toLowerCase())
}

/** Asset-server URL that streams the local file to the webview for previewing. */
export function previewURL(path: string): string {
	return `/localfile?path=${encodeURIComponent(path)}`
}
