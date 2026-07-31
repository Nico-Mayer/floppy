// Platform detection for OS-specific UI: the window controls (frameless on
// Windows, traffic-light spacer on macOS) and the modifier-key label. One place
// so the titlebar and the shortcut hints agree. `userAgentData.platform` is the
// modern signal; fall back to the deprecated `platform` string. Guarded so a
// stray import can never throw.

const platform =
	typeof navigator === 'undefined'
		? ''
		: ((navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
			navigator.platform ??
			'')

export const isMac = /mac/i.test(platform)
export const isWindows = /win/i.test(platform)

// Mobile (Android/iOS): drives the mobile chrome — no desktop window controls,
// safe-area insets, and hiding actions the platform can't honour (e.g. opening
// a received-files folder in a file manager). Keyed off the user agent, since
// `userAgentData.platform` reports the OS, not the form factor.
const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
export const isMobile = /android|iphone|ipad|ipod/i.test(userAgent)

/** Modifier-key label: mac stacks glyphs (⌘1); Ctrl needs a separator (Ctrl+1). */
export const modKey = isMac ? '⌘' : 'Ctrl+'
