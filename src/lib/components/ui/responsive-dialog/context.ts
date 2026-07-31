import { isNarrow } from '$lib/platform'

// A centered Dialog at or above the app's `sm` breakpoint, a bottom Drawer
// below it — matching the `max-sm:` treatment used everywhere else. The
// threshold is not defined here: it comes from `isNarrow` in $lib/platform, so
// this and the stylesheets cannot drift apart.

/** Reactive — read inside markup or `$derived` and it re-renders across the breakpoint. */
export function isDesktop() {
	return !isNarrow()
}
