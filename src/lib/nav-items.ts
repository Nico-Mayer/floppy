// The app's top-level destinations, in one place: the desktop sidebar and the
// mobile bottom bar both read from here, so they can never disagree about what
// exists, what it is called, or whether it works yet.
//
// Order puts the two things you do (send, receive) above the two you set up
// (devices, settings). It is also the order the bottom bar renders in, and the
// order the ⌘1-⌘4 shortcuts follow.

import DownloadIcon from '@lucide/svelte/icons/download'
import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
import SendIcon from '@lucide/svelte/icons/send'
import SettingsIcon from '@lucide/svelte/icons/settings'

// `stub` sits on every entry, not only the one that needs it. `as const` has to
// stay so the hrefs keep their literal types (SvelteKit's `resolve()` requires
// that), and a property present on only some entries of a const tuple cannot be
// read without a narrowing dance at every call site.
//
// stub = laid out, but not connected to anything yet. Declared once here so a
// page's own marker and its navigation row can never disagree — see StubMark.
export const navItems = [
	{ href: '/send', label: 'Send', icon: SendIcon, hint: 'Share your files', stub: false },
	{ href: '/receive', label: 'Receive', icon: DownloadIcon, hint: 'Take theirs', stub: false },
	{
		href: '/devices',
		label: 'Devices',
		icon: MonitorSmartphoneIcon,
		hint: 'Send without a code',
		stub: false
	},
	{ href: '/settings', label: 'Settings', icon: SettingsIcon, hint: 'Preferences', stub: true }
] as const

export type NavItem = (typeof navItems)[number]

/** Whether a destination is still a preview. The one source for every marker. */
export function isStub(pathname: string): boolean {
	return navItems.find((item) => item.href === pathname)?.stub === true
}
