<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Spinner } from '$lib/components/ui/spinner'
	import { fast, normal } from '$lib/motion'
	import { scanner } from '$lib/scan.svelte'
	import CheckIcon from '@lucide/svelte/icons/check'
	import KeyboardIcon from '@lucide/svelte/icons/keyboard'
	import XIcon from '@lucide/svelte/icons/x'
	import { fade, fly } from 'svelte/transition'

	// The app's own chrome over the camera.
	//
	// The plugin runs the camera *behind* the webview (windowed), so what shows
	// through is whatever this app does not paint: `html[data-scanning]` in
	// layout.css turns the page transparent and hides the shell, and everything
	// visible here is drawn by this component. That is the whole point of doing it
	// this way — the OS full-screen scanner has no way back to the app, no way to
	// switch to typing, and no place to say what the user is meant to be pointing at.
	//
	// The camera cannot be *framed*, only revealed. It is one surface behind the whole
	// webview and the plugin takes no bounds, so a small live preview inside a drawer
	// with the app around it is not a thing this can do — anything painted over the
	// camera hides it, including the app. What is possible is the shape the phone
	// scanners people know actually use: dim everything, leave one rounded window
	// bright, put the controls under it. The dimming is a single spread shadow on the
	// window itself, so there is one element and no four-rects-around-a-hole.
	//
	// Lives in the layout rather than on the Devices page: the page is inside the
	// shell this hides, so a sheet rendered there would be hidden with it.

	const phase = $derived(scanner.phase)
	/**
	 * How the window is painted, and how hard everything around it is dimmed.
	 *
	 * While the camera is starting or stopping there is nothing to frame, so the frame
	 * stops existing: the window goes black and the dimming goes fully opaque, which
	 * makes the whole screen one black field. A lit panel floating in a dimmed screen
	 * is what a square with `bg-popover` looked like, and it read as a mistake.
	 *
	 * Holding a result is the opposite case — the spinner and the check have to be
	 * legible — so there the window is a panel on purpose.
	 */
	const window_ = $derived(
		scanner.warming
			? 'bg-black shadow-[0_0_0_100vmax_rgb(0_0_0/1)]'
			: phase === 'caught' || phase === 'added'
				? 'bg-popover shadow-[0_0_0_100vmax_rgb(0_0_0/0.72)]'
				: 'shadow-[0_0_0_100vmax_rgb(0_0_0/0.72)]'
	)
	/**
	 * The document flag lives here rather than in the scanner, because the shell's
	 * fade has to line up with this component's own transitions rather than with the
	 * moment an attempt ends. The scanner knows when the attempt is over; only this
	 * knows when the animation is.
	 *
	 * Cleared at outro *start*, so the shell fades back in across the chrome's fade
	 * out — the mirror of opening, where the chrome arrives across the shell's fade
	 * out. Waiting for outro end instead left a window with nothing painting: the
	 * camera had stopped, the page was still transparent, and the gap read as a black
	 * frame.
	 */
	$effect(() => {
		if (scanner.active) document.documentElement.dataset.scanning = ''
	})

	function shellBack() {
		delete document.documentElement.dataset.scanning
	}

	const headline = $derived(
		{
			aiming: 'Point at the code on your other device',
			caught: 'Got that. Asking them to link…',
			added: 'Added',
			retry: "That code didn't work"
		}[phase]
	)
	const hint = $derived(
		{
			aiming: 'Open Devices there and press the code button to show it.',
			caught: scanner.slow
				? 'Still waiting. Someone has to say yes on that device.'
				: 'They just have to say yes.',
			added: 'You can send to it without a code from now on.',
			retry: scanner.problem
		}[phase]
	)

	/**
	 * `added` is the only phase with nothing to escape: it is under a second long and
	 * it already succeeded. Everything else keeps a way out, including the wait — a
	 * pairing waits on a person looking at another phone, and that person may not be
	 * in the room.
	 */
	const escapable = $derived(phase !== 'added')
</script>

{#if scanner.active}
	<!-- Nothing here has a background except the sheet, the controls, and the window
	     once it is holding a result: every transparent pixel is camera.
	     No `overflow-hidden` anywhere down to the window: the dimming is a shadow that
	     reaches past the viewport on purpose, and clipping it would leave the camera
	     bright in the corners. -->
	<div
		class="fixed inset-0 z-70 flex flex-col"
		transition:fade={{ duration: normal() }}
		onoutrostart={shellBack}
	>
		<!-- The way back, top trailing corner, clear of the notch.
		     `z-10` because the dimming below is a box shadow, and a shadow cast by a
		     later sibling paints over an earlier one: without this the control sits
		     under its own screen's dimming and reads as disabled.
		     Present while waiting too, not just while aiming: the wait is on someone
		     else's yes, and it must be possible to stop wanting it. Gone only in the
		     moment after it worked. -->
		<div class="relative z-10 flex justify-end p-4 pt-[calc(var(--safe-top)+--spacing(4))]">
			{#if escapable}
				<Button
					variant="secondary"
					size="icon"
					aria-label={phase === 'caught' ? 'Stop waiting' : 'Stop scanning'}
					onclick={() => scanner.stop()}
				>
					<XIcon />
				</Button>
			{/if}
		</div>

		<!-- The window. Nothing is painted inside it while aiming, so it is the only
		     bright part of the screen; the spread shadow paints everything outside it,
		     which is what turns "the camera is behind the whole webview" into "the
		     camera is in this frame". Corner marks on top, because a plain rounded rect
		     at this size reads as a box rather than as somewhere to aim.
		     Once a code is read the camera has stopped, so the hole would show nothing:
		     it fills instead, and becomes where the result is said. -->
		<div class="relative z-0 flex flex-1 items-center justify-center p-8">
			<div
				class={[
					'relative flex aspect-square w-full max-w-72 items-center justify-center rounded-4xl',
					'transition-[background-color,box-shadow] duration-300',
					window_
				]}
			>
				{#if scanner.warming && phase === 'aiming'}
					<!-- The camera is coming. Nothing says so louder than this, on purpose:
					     it is a third of a second, and a spinner for a third of a second is
					     worse than a surface that quietly becomes a view. -->
				{:else if phase === 'caught'}
					<Spinner class="size-8 text-muted-foreground" />
				{:else if phase === 'added'}
					<span
						class="flex size-16 animate-pop items-center justify-center rounded-full bg-receive/15 text-receive"
					>
						<CheckIcon class="size-8" />
					</span>
				{:else}
					{#each [['-top-1 -left-1', 'rounded-tl-4xl border-t-4 border-l-4'], ['-top-1 -right-1', 'rounded-tr-4xl border-t-4 border-r-4'], ['-bottom-1 -left-1', 'rounded-bl-4xl border-b-4 border-l-4'], ['-bottom-1 -right-1', 'rounded-br-4xl border-b-4 border-r-4']] as [place, edges] (place)}
						<span class="absolute size-10 border-white/90 {place} {edges}" in:fade={{ duration: fast() }}
						></span>
					{/each}
				{/if}
			</div>
		</div>

		<!-- The sheet: where the flow is, and the way to type instead. Opaque, because
		     it is the only part of this that is meant to be read. -->
		<div
			class="relative z-10 rounded-t-4xl bg-popover p-4 pb-[calc(var(--safe-bottom)+--spacing(4))] shadow-xl"
			transition:fly={{ y: 120, duration: normal() }}
		>
			<div class="mx-auto flex w-full max-w-sm flex-col gap-3 text-center">
				<p class="text-sm font-medium">{headline}</p>
				<p class={['text-xs', phase === 'retry' ? 'text-destructive' : 'text-muted-foreground']}>
					{hint}
				</p>
				<!-- Offered while aiming, and again once a wait has gone on long enough to
				     doubt: those are the two moments where typing is the better plan. Not in
				     the first seconds of a wait, where it would be noise, and not after it
				     worked. -->
				{#if phase === 'aiming' || phase === 'retry' || (phase === 'caught' && scanner.slow)}
					<Button variant="secondary" class="w-full" onclick={() => scanner.typeInstead()}>
						<KeyboardIcon data-icon="inline-start" />
						Type the code instead
					</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}
