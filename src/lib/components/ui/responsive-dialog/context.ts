import { MediaQuery } from 'svelte/reactivity'

// One shared query for every ResponsiveDialog: a centered Dialog at/above the
// app's `sm` breakpoint (640px), a bottom Drawer below it — matching the
// max-sm mobile treatment used elsewhere (edge-to-edge sheet).
const desktop = new MediaQuery('min-width: 640px')

/** Reactive — read inside markup/`$derived` and it re-renders across the breakpoint. */
export function isDesktop() {
	return desktop.current
}
