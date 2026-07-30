// Runtime bits the generated bindings don't cover: window controls, clipboard,
// and a focus hook. Typed commands and events come from `./bindings` (generated
// by tauri-specta) — this file is only the handful of Tauri runtime APIs the UI
// touches directly.

import { getCurrentWindow } from '@tauri-apps/api/window'

export const Window = {
	Minimise: () => getCurrentWindow().minimize(),
	ToggleMaximise: () => getCurrentWindow().toggleMaximize(),
	Close: () => getCurrentWindow().close()
}

export const Clipboard = {
	Text: () => navigator.clipboard.readText(),
	SetText: (text: string) => navigator.clipboard.writeText(text)
}

/**
 * Run `cb` whenever the window regains focus. The DOM 'focus' event is
 * unreliable in the webview on native re-activation, so this uses Tauri's
 * window focus signal instead. Returns a synchronous unsubscribe (the async
 * listener is torn down once it attaches).
 */
export function onWindowFocus(cb: () => void): () => void {
	let unlisten: (() => void) | undefined
	let cancelled = false
	getCurrentWindow()
		.onFocusChanged(({ payload: focused }) => {
			if (focused) cb()
		})
		.then((un) => (cancelled ? un() : (unlisten = un)))
	return () => {
		cancelled = true
		unlisten?.()
	}
}
