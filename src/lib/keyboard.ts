// Keep the focused field above the soft keyboard.
//
// This is ours to do because of the viewport we asked for. `app.html` sets
// `interactive-widget=overlays-content`, so the keyboard slides over the app and
// the *layout* viewport stays the full screen. That is what keeps the shell from
// being resized under the keys — but it also means the browser's own
// scroll-the-field-into-view has nothing to do: by its measure the field is
// already on screen. iOS then falls back to scrolling the document, which is
// pinned to the window height and cannot scroll, so a field low on the page just
// sits behind the keys.
//
// The visual viewport is the one that shrinks, so that is what we measure
// against, and the element we move is the scroll region the field actually lives
// in (PageShell's) rather than the window.

import { isPhoneChrome } from './platform'

/** Breathing room between the field and the top of the keyboard. */
const MARGIN = 12

/** How long to wait for the keyboard's geometry after a focus. */
const SETTLE_MS = 250

function isTextEntry(node: Element | null): node is HTMLElement {
	if (!(node instanceof HTMLElement)) return false
	return node.isContentEditable || node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'
}

/** The nearest ancestor that owns a scroll region, scrollable right now or not. */
function scroller(from: HTMLElement): HTMLElement | null {
	for (let node = from.parentElement; node; node = node.parentElement) {
		const overflow = getComputedStyle(node).overflowY
		if (overflow === 'auto' || overflow === 'scroll') return node
	}
	return null
}

/**
 * Scroll the focused field clear of the keyboard, and keep following it.
 * A no-op off a phone build, where nothing covers the viewport. Returns an
 * unsubscribe.
 */
export function keepFocusVisible(): () => void {
	const viewport = typeof window === 'undefined' ? undefined : window.visualViewport
	if (!isPhoneChrome || !viewport) return () => {}
	const vv = viewport

	let timer: ReturnType<typeof setTimeout> | undefined
	/** The region we lent room to, so it can be given back. */
	let padded: HTMLElement | null = null

	function unpad() {
		if (!padded) return
		padded.style.paddingBottom = ''
		padded = null
	}

	function bring() {
		const field = document.activeElement
		if (!isTextEntry(field)) {
			unpad()
			return
		}

		// The floor of what the user can actually see, in the coordinates
		// getBoundingClientRect reports: the visual viewport's offset plus its
		// height. With the keyboard up, that is the top of the keys.
		const floor = vv.offsetTop + vv.height
		const overlap = field.getBoundingClientRect().bottom + MARGIN - floor
		if (overlap <= 0) {
			unpad()
			return
		}

		const region = scroller(field)
		if (!region) {
			window.scrollBy({ top: overlap, behavior: 'smooth' })
			return
		}

		// A short page has nothing to scroll, so scrolling it does nothing and the
		// field stays behind the keys. Lend the region exactly the room the keyboard
		// is taking, which turns the move into an ordinary scroll; it is handed back
		// the moment the field blurs or the keyboard goes.
		const room = overlap + region.scrollTop - (region.scrollHeight - region.clientHeight)
		if (room > 0) {
			padded = region
			region.style.paddingBottom = `${Math.ceil(room)}px`
		}
		region.scrollBy({ top: overlap, behavior: 'smooth' })
	}

	// A focus does not mean the keyboard is up yet, so wait for its geometry. The
	// resize below is the reliable signal; this timer covers moving from one field
	// to another with the keyboard already up, where nothing resizes at all.
	function onFocusIn() {
		clearTimeout(timer)
		timer = setTimeout(bring, SETTLE_MS)
	}

	// focusout fires before the next element takes focus, so activeElement is
	// briefly <body>: read it a frame later, or moving between two fields would
	// hand the room back and immediately borrow it again.
	function onFocusOut() {
		requestAnimationFrame(() => {
			if (!isTextEntry(document.activeElement)) unpad()
		})
	}

	document.addEventListener('focusin', onFocusIn)
	document.addEventListener('focusout', onFocusOut)
	vv.addEventListener('resize', bring)
	// The keyboard can also move the visual viewport without resizing it, e.g. an
	// accessory bar appearing above it.
	vv.addEventListener('scroll', bring)

	return () => {
		clearTimeout(timer)
		unpad()
		document.removeEventListener('focusin', onFocusIn)
		document.removeEventListener('focusout', onFocusOut)
		vv.removeEventListener('resize', bring)
		vv.removeEventListener('scroll', bring)
	}
}
