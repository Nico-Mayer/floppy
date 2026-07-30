// The app's top-level destinations, in one place: the desktop sidebar, the
// mobile bottom bar and the mobile app-bar title all read from here, so they
// can never disagree about what exists or what it is called.
//
// Order puts the two things you do (transfer, pair) above the two you check
// (activity, settings).

import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right'
import Clock3Icon from '@lucide/svelte/icons/clock-3'
import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
import SettingsIcon from '@lucide/svelte/icons/settings'

export const navItems = [
	{ href: '/', label: 'Transfer', icon: ArrowLeftRightIcon, hint: 'Send & receive' },
	{ href: '/devices', label: 'Devices', icon: MonitorSmartphoneIcon, hint: 'Send without a code' },
	{ href: '/activity', label: 'Activity', icon: Clock3Icon, hint: 'Recent transfers' },
	{ href: '/settings', label: 'Settings', icon: SettingsIcon, hint: 'Preferences' }
] as const

export type NavItem = (typeof navItems)[number]

/** Every route is a leaf, so an exact match is enough. */
export function titleFor(pathname: string): string {
	return navItems.find((item) => item.href === pathname)?.label ?? 'Floppy'
}
