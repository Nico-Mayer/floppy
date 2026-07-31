// The platform signals the UI branches on, and what each one actually measures.
//
// Three different questions used to share the name "mobile", which is how a
// narrow desktop window ended up with a phone's content layout but a desktop
// titlebar, with nothing in the code saying that was deliberate. They are
// separate questions, so they get separate names. Pick the one you mean:
//
//   isTouch()       pointer coarseness. Hit areas, controls that cannot be
//                   revealed by hover, and whether haptics fire.
//   isNarrow()      viewport width below Tailwind's `sm`. Full-bleed content
//                   and whether a transient surface is a dialog or a drawer.
//   isPhoneChrome   platform form factor. The mobile app bar vs the desktop
//                   titlebar, the `data-mobile` document flag, and hiding
//                   actions the platform cannot perform at all.
//
// A fourth threshold lives in `hooks/is-mobile.svelte.ts` and stays there: it
// is the navigation's own drawer-vs-rail question, which is not this file's
// business. See the note in that file for why it is 768 and not 640.
//
// The pointer and width signals are functions, not constants, because they are
// reactive: read them inside markup or a `$derived` and the component follows
// the viewport. `isPhoneChrome` and the OS flags are constants because a
// running app cannot change platform.

import { MediaQuery } from 'svelte/reactivity'

// `userAgentData.platform` is the modern signal for the OS; fall back to the
// deprecated `platform` string. Guarded so a stray import can never throw.
const platform =
	typeof navigator === 'undefined'
		? ''
		: ((navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
			navigator.platform ??
			'')

export const isMac = /mac/i.test(platform)
export const isWindows = /win/i.test(platform)

// Android or iOS, by user agent. Form factor, not width and not pointer type:
// `userAgentData.platform` reports the OS, so the user agent is what tells us
// this is a phone or tablet build.
//
// Use it only for things that are true of the *platform*: the app bar instead
// of a window titlebar, the `data-mobile` flag on `<html>`, and hiding an
// action the OS cannot honour (revealing a folder in a file manager). For
// anything about how big the window is use `isNarrow()`; for anything about
// fingers use `isTouch()`.
const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
export const isPhoneChrome = /android|iphone|ipad|ipod/i.test(userAgent)

// Module-scope queries: one instance shared by every caller, so two components
// asking the same question can never disagree.
const coarse = new MediaQuery('pointer: coarse')
// 639.98px rather than 639px: widths are fractional on scaled displays, and a
// whole-pixel max-width leaves a sliver where neither this nor Tailwind's `sm`
// matches.
const narrow = new MediaQuery('max-width: 639.98px')

/**
 * The pointer is coarse — a finger rather than a mouse.
 *
 * Drives hit-area minimums, controls that must be visible because there is no
 * hover to reveal them with, and whether haptic feedback is attempted. Not a
 * proxy for "is a phone": a touchscreen laptop is coarse, and a phone driving
 * an external mouse is not.
 *
 * Reactive — read it in markup or a `$derived`.
 */
export const isTouch = () => coarse.current

/**
 * The viewport is narrower than Tailwind's `sm` breakpoint (640px).
 *
 * Drives full-bleed content layout and whether a transient surface renders as
 * a centered dialog or a bottom drawer, so it matches what `max-sm:` does in
 * the stylesheets. True on a phone, and also true of a desktop window someone
 * has dragged narrow, which is the point.
 *
 * Reactive — read it in markup or a `$derived`.
 */
export const isNarrow = () => narrow.current

/** Modifier-key label: mac stacks glyphs (⌘1); Ctrl needs a separator (Ctrl+1). */
export const modKey = isMac ? '⌘' : 'Ctrl+'
