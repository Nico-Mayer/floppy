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
