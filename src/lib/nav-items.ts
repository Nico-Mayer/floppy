// The app's top-level destinations, in one place: the desktop sidebar, the
// mobile drawer and the mobile app-bar title all read from here, so they can
// never disagree about what exists, what it is called, or whether it works yet.
//
// Order puts the two things you do (transfer, pair) above the two you check
// (activity, settings).

import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right'
import Clock3Icon from '@lucide/svelte/icons/clock-3'
import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
import SettingsIcon from '@lucide/svelte/icons/settings'

// `stub` sits on every entry, not only the two that need it. `as const` has to
// stay so the hrefs keep their literal types (SvelteKit's `resolve()` requires
// that), and a property present on only some entries of a const tuple cannot be
// read without a narrowing dance at every call site.
//
// stub = laid out, but not connected to anything yet. Declared once here so a
// page's own marker and its navigation row can never disagree — see StubMark.
export const navItems = [
	{ href: '/', label: 'Transfer', icon: ArrowLeftRightIcon, hint: 'Send & receive', stub: false },
	{
		href: '/devices',
		label: 'Devices',
		icon: MonitorSmartphoneIcon,
		hint: 'Send without a code',
		stub: false
	},
	{ href: '/activity', label: 'Activity', icon: Clock3Icon, hint: 'Recent transfers', stub: true },
	{ href: '/settings', label: 'Settings', icon: SettingsIcon, hint: 'Preferences', stub: true }
] as const

export type NavItem = (typeof navItems)[number]

/** Every route is a leaf, so an exact match is enough. */
export function titleFor(pathname: string): string {
	return navItems.find((item) => item.href === pathname)?.label ?? 'Floppy'
}

/** Whether a destination is still a preview. The one source for every marker. */
export function isStub(pathname: string): boolean {
	return navItems.find((item) => item.href === pathname)?.stub === true
}
