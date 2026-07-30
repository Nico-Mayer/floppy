// In-app back navigation. The webview has no browser chrome and (on mobile) no
// hardware back, so we surface our own back control. Rather than remembering the
// "previous page" — which only ever holds the last value and ping-pongs on a
// second back — we lean on the SPA history stack the router already maintains
// and just track how deep into it we are, so we know when a back exists.

class Nav {
	// Steps taken forward within the app since launch (link/goto push, a back
	// pops). Zero means we're at the entry page — nothing to go back to.
	#depth = $state(0)

	get canGoBack() {
		return this.#depth > 0
	}

	/** Feed every `afterNavigate` here so depth tracks the real history stack. */
	record(type: string) {
		if (type === 'enter') return // initial load — the bottom of the stack
		if (type === 'popstate') this.#depth = Math.max(0, this.#depth - 1)
		else this.#depth += 1 // link / goto / form — a forward push
	}

	back() {
		if (this.canGoBack) history.back()
	}

	/**
	 * Declare the current page the bottom of the stack again. The mobile bottom
	 * bar switches tabs by replacing the history entry, so after one there is
	 * genuinely nothing behind us, however deep we had drilled in before.
	 */
	reset() {
		this.#depth = 0
	}
}

export const nav = new Nav()
