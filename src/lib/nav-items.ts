// The app's top-level destinations, in one place: the desktop sidebar and the
// mobile bottom bar both read from here, so they can never disagree about what
// exists, what it is called, or whether it works yet.
//
// Order puts the two things you do (send, receive) above the two you set up
// (devices, then settings or account). It is also the order the bottom bar
// renders in, and the order the ⌘1-⌘4 shortcuts follow.
//
// Platform decides what exists; width decides how it renders. Phone chrome
// gets Account instead of Settings: a phone follows the system theme and keeps
// its deep settings in the OS, so the screen had nothing real to offer there.
// The test is form factor, not width — a narrow desktop window keeps the
// desktop set in the bottom bar.

import CircleUserRoundIcon from '@lucide/svelte/icons/circle-user-round'
import DownloadIcon from '@lucide/svelte/icons/download'
import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
import SendIcon from '@lucide/svelte/icons/send'
import SettingsIcon from '@lucide/svelte/icons/settings'
import { isPhoneChrome } from '$lib/platform'

// `stub` and `platform` sit on every entry, not only the ones that need them.
// `as const` has to stay so the hrefs keep their literal types (SvelteKit's
// `resolve()` requires that), and a property present on only some entries of a
// const tuple cannot be read without a narrowing dance at every call site.
//
// stub = laid out, but not connected to anything yet. Declared once here so a
// page's own marker and its navigation row can never disagree — see StubMark.
// Settings is not a stub any more: its theme and download-folder sections are
// real, and the two that are not carry their own section marks.
export const navItems = [
	{
		href: '/send',
		label: 'Send',
		icon: SendIcon,
		hint: 'Share your files',
		stub: false,
		platform: 'all'
	},
	{
		href: '/receive',
		label: 'Receive',
		icon: DownloadIcon,
		hint: 'Take theirs',
		stub: false,
		platform: 'all'
	},
	{
		href: '/devices',
		label: 'Devices',
		icon: MonitorSmartphoneIcon,
		hint: 'Send without a code',
		stub: false,
		platform: 'all'
	},
	{
		href: '/settings',
		label: 'Settings',
		icon: SettingsIcon,
		hint: 'Preferences',
		stub: false,
		platform: 'desktop'
	},
	{
		href: '/account',
		label: 'Account',
		icon: CircleUserRoundIcon,
		hint: 'Sync your devices',
		stub: true,
		platform: 'phone'
	}
] as const

export type NavItem = (typeof navItems)[number]

/**
 * The destinations the running platform declares, in render order. Every
 * consumer — both navigation surfaces, the ⌘1-⌘4 shortcuts, and the
 * route-transition ordering — reads this, never the raw list, so the platforms
 * cannot drift apart. Desktop reaches Account too, but through the sidebar's
 * account row rather than a list entry.
 */
export const platformNavItems: NavItem[] = navItems.filter(
	(item) => item.platform === 'all' || item.platform === (isPhoneChrome ? 'phone' : 'desktop')
)

/** Whether a destination is still a preview. The one source for every marker. */
export function isStub(pathname: string): boolean {
	return navItems.find((item) => item.href === pathname)?.stub === true
}
