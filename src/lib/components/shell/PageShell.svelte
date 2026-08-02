<script lang="ts">
	import { PULL_TRIGGER, pullToRefresh } from '$lib/actions/pull-to-refresh.svelte'
	import { Spinner } from '$lib/components/ui/spinner'
	import { isTouch } from '$lib/platform'
	import { cn } from '$lib/utils'
	import type { Snippet } from 'svelte'

	// The one container every route renders through. It owns four things a route
	// used to hand-write, and got subtly different every time: the gutters, the
	// content width cap, the scroll region, and the rhythm between sections.
	//
	// The differences between routes are real, so they are props rather than
	// something to flatten. Transfer sizes itself to the viewport and wants the
	// full width with a tighter vertical; the reading pages want a narrow column
	// that scrolls.

	let {
		scroll = false,
		width = 'prose',
		pad = 'default',
		gap = 'section',
		onrefresh,
		class: className,
		children
	}: {
		/**
		 * Owns the vertical scroll. Off for a route whose content sizes itself to
		 * the viewport (Transfer), on for one that grows past it.
		 */
		scroll?: boolean
		/** `prose` for a reading column, `wide` for a surface that wants the room. */
		width?: 'prose' | 'wide'
		/**
		 * `tight` trades vertical gutter for content height — Transfer's card fills
		 * the viewport on a phone and cannot spare 16px top and bottom. Everything
		 * else uses `default`.
		 */
		pad?: 'default' | 'tight'
		/**
		 * Rhythm between top-level children. `none` for a route whose content owns
		 * its own spacing (Transfer's tab root does).
		 */
		gap?: 'section' | 'none'
		/**
		 * Enables pull-to-refresh on touch. Only meaningful with `scroll`, since the
		 * gesture belongs to the scroller this owns.
		 */
		onrefresh?: () => void | Promise<void>
		class?: string
		children: Snippet
	} = $props()

	// How far the current pull has come, and whether a reload is running.
	let pull = $state(0)
	let refreshing = $state(false)

	// Once triggered, hold the indicator at the trigger point until the reload
	// settles, so it does not snap away while work is still happening.
	const shift = $derived(refreshing ? PULL_TRIGGER : pull)

	// Same horizontal gutter in both scales, so the left edge of content never
	// moves between routes. Only the vertical differs, which is the point of
	// `tight`. Both resolve to one uniform `sm:p-6` once there is desktop room.
	const padding = {
		default: 'p-4 sm:p-6',
		tight: 'px-4 py-2 sm:p-6'
	}

	const maxWidth = {
		prose: 'max-w-xl',
		wide: 'max-w-3xl md:max-w-4xl lg:max-w-5xl'
	}

	const gaps = {
		section: 'gap-6',
		none: ''
	}
</script>

<!-- A div, not a <main>: Sidebar.Inset is already the page's <main> landmark, so
     one here would nest a second one. (The Transfer route used to do exactly
     that, which is what made it worth naming.)
     overscroll-contain: `html` sets overscroll-behavior: none, but that does not
     reach an inner scroller, so without it reaching the end of a long page
     chains the scroll to the webview and rubber-bands the whole app on iOS.
     Safe-area insets are applied outside this by Sidebar.Inset, so the scroll
     region's floor is already clear of the gesture bar. -->
<div
	class={cn(
		scroll ? 'relative h-full overflow-y-auto overscroll-contain' : 'flex min-h-0 flex-1 flex-col',
		className
	)}
	use:pullToRefresh={{
		onrefresh: onrefresh ?? (() => {}),
		onpull: (distance) => (pull = distance),
		onbusy: (busy) => (refreshing = busy),
		enabled: scroll && onrefresh !== undefined && isTouch()
	}}
>
	{#if onrefresh && shift > 0}
		<!-- Sits in the space the pull opens up, rather than overlaying content. -->
		<div
			class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
			style="height: {shift}px"
		>
			<Spinner size="control" class={cn('text-muted-foreground', !refreshing && 'animate-none')} />
		</div>
	{/if}

	<!-- The inner column carries the gutters and the width cap. It only claims
	     flex height when the shell is *not* the scroller: inside an
	     overflow-y-auto parent, `flex-1 min-h-0` would clamp this to the viewport
	     and the overflow would have nowhere to go, so the page would not scroll.
	     The pull translates this rather than the scroller itself, so the scroll
	     position is untouched by the gesture. -->
	<div
		class={cn(
			'mx-auto flex w-full flex-col',
			!scroll && 'min-h-0 flex-1',
			!pull && 'transition-transform',
			maxWidth[width],
			padding[pad],
			gaps[gap]
		)}
		style={shift ? `transform: translateY(${shift}px)` : undefined}
	>
		{@render children()}
	</div>
</div>
