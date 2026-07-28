// In-sheet view stack — a stand-in for real routing. When Settings and
// Trusted devices graduate to their own pages, each `view` becomes a route and
// the switch in AccountSheet goes away.
export type View = 'menu' | 'login' | 'settings' | 'devices'

export const titles: Record<View, string> = {
	menu: 'Account',
	login: 'Sign in',
	settings: 'Settings',
	devices: 'Trusted devices'
}

/**
 * Screen-reader description for each view. A dialog needs an accessible
 * description, and the sheet's own body is a whole view — so this is the one
 * place that says out loud what the current screen is for.
 */
export const descriptions: Record<View, string> = {
	menu: 'Account, app settings, and trusted devices.',
	login: 'Sign in to sync your trusted devices.',
	settings: 'Preferences for transfers, appearance, and the relay.',
	devices: 'Pair devices to send files without sharing a code.'
}
