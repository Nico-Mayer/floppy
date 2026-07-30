// In-sheet view stack — a stand-in for real routing. When Settings and
// Trusted devices graduate to their own pages, each `view` becomes a route and
// the switch in AccountSheet goes away.
export type View = 'menu' | 'login' | 'settings' | 'devices' | 'activity'

export const titles: Record<View, string> = {
	menu: 'Account',
	login: 'Sign in',
	settings: 'Settings',
	devices: 'Paired devices',
	activity: 'Activity'
}

/**
 * Screen-reader description for each view. A dialog needs an accessible
 * description, and the sheet's own body is a whole view — so this is the one
 * place that says out loud what the current screen is for.
 */
export const descriptions: Record<View, string> = {
	menu: 'Your account, settings, and paired devices.',
	login: 'Sign in to keep your paired devices in sync.',
	settings: 'Change how transfers, colours, and the relay work.',
	devices: 'Pair a device so you can send to it without a code.',
	activity: 'Your recent transfers, newest first.'
}
