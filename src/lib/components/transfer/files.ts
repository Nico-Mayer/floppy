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
 * URL the webview can load to preview a local file. Uses Tauri's asset protocol
 * (gated by `assetProtocol.scope` in tauri.conf), which serves the file
 * directly — no round-trip through a dev/asset server. Full-resolution for now;
 * server-side downscaling behind this same call is slice 5.5.
 */
export function previewURL(path: string): string {
	return convertFileSrc(path)
}
