/** Short uppercase extension for the file-row badge, e.g. "PNG". */
export function ext(path: string): string {
	const name = path.split(/[\\/]/).pop() ?? path
	const dot = name.lastIndexOf('.')
	return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : 'FILE'
}

// Image types the webview renders inline as a queue thumbnail (served via the
// asset protocol, see previewURL). A type the webview can't decode just fails
// the <img> and the tile keeps its glyph, so this list degrades quietly.
const PREVIEW_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico'])

/** Whether this file can be shown as an inline image preview in its tile. */
export function isPreviewable(path: string): boolean {
	const name = path.split(/[\\/]/).pop() ?? path
	const dot = name.lastIndexOf('.')
	return dot > 0 && PREVIEW_EXTS.has(name.slice(dot + 1).toLowerCase())
}

import { convertFileSrc } from '@tauri-apps/api/core'

/**
 * URL the webview can load to preview a local file. Served over the `thumb://`
 * custom protocol (see src-tauri/src/preview.rs), which decodes and downscales
 * png/jpeg/gif to a small thumbnail off the UI thread, streams other image
 * types as-is, and caches per session (ETag + max-age). Replaces the Go build's
 * `/localfile` asset route.
 */
export function previewURL(path: string): string {
	return convertFileSrc(path, 'thumb')
}
