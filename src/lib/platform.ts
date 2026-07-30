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

/** Modifier-key label: mac stacks glyphs (⌘1); Ctrl needs a separator (Ctrl+1). */
export const modKey = isMac ? '⌘' : 'Ctrl+'
