<script lang="ts">
	import { horizontalSwipe } from '$lib/actions/horizontal-swipe.svelte'
	import { fast } from '$lib/motion'
	import { isTouch } from '$lib/platform'
	import type { Snippet } from 'svelte'

	// A row that slides left to reveal one action behind it, the way a mail app
	// reveals delete. Touch only: a mouse has no drag gesture here, so a surface
	// using this must keep a clickable path to the same action for fine pointers.
	//
	// Only ever slides left, and only reveals — it never performs the action
	// itself. The revealed control is a real button, so the action is still a
	// deliberate second tap rather than something a swipe can trigger by accident.

	let {
		/** Label for the revealed control, used as its accessible name. */
		label,
		/** The revealed control was pressed. */
		onaction,
		action,
		children
	}: {
		label: string
		onaction: () => void
		/** The revealed control's contents, e.g. an icon. */
		action: Snippet
		children: Snippet
	} = $props()

	// Owned here rather than passed in: a parent that wanted to close other rows
	// would have to hold this, and one-way passing a value the child also writes is
	// exactly the state-ownership trap that produces stale rows.
	let open = $state(false)

	// No drag gesture on a fine pointer, so the reveal is not merely unused there
	// — it is unreachable. Render it only where it can be opened, rather than
	// leaving a control behind the row that nothing can ever slide aside.
	const touch = $derived(isTouch())

	/** How much of the row slides aside, and so how wide the action is. */
	const REVEAL = 88

	let dragX = $state(0)
	let dragging = $state(false)

	// Where the row actually sits: its resting offset plus the live drag, clamped
	// so it can neither pass the action nor slide right of its closed position.
	const offset = $derived(Math.max(-REVEAL, Math.min(0, (open ? -REVEAL : 0) + dragX)))

	function onProgress(dx: number) {
		dragging = true
		dragX = dx
	}

	function settle(next: boolean) {
		open = next
		dragX = 0
		dragging = false
	}

	function onCommit(direction: -1 | 1) {
		// Left opens, right closes. Either way the row snaps to one of two rests.
		settle(direction === -1)
	}
</script>

<!-- data-swipe-row marks this subtree as owning horizontal touches inside it, the
     declaration the shared arbitration order is written around.
     No `claim`: the row takes a horizontal touch anywhere across its full width,
     including the left edge, which used to be reserved for the navigation
     drawer's opening gesture. There is no drawer and no reserved strip now. -->
<div data-swipe-row class="relative isolate overflow-hidden rounded-2xl">
	<!-- Behind the row, only reachable once it has slid aside. aria-hidden while
	     closed so a screen reader is not offered a control nobody can see. -->
	{#if touch}
		<div class="absolute inset-y-0 right-0 flex" aria-hidden={!open}>
			<button
				type="button"
				class="flex w-(--reveal) items-center justify-center bg-destructive/15 text-destructive transition-colors hover:bg-destructive/25"
				style="--reveal: {REVEAL}px"
				aria-label={label}
				tabindex={open ? 0 : -1}
				onclick={() => {
					settle(false)
					onaction()
				}}
			>
				{@render action()}
			</button>
		</div>
	{/if}

	<!-- The row itself. Opaque, because the action sits behind it: a row whose
	     children have no fill of their own would show the action through at rest,
	     which reads as a second delete button rather than as something revealed.
	     No transition while the finger is down, so it tracks rather than lags; the
	     transition comes back for the snap on release. -->
	<div
		class="relative bg-background"
		class:transition-transform={!dragging}
		style="transform: translateX({offset}px); transition-duration: {fast()}ms"
		use:horizontalSwipe={{
			enabled: touch,
			threshold: 0.25,
			onProgress,
			onCommit,
			onCancel: () => settle(open)
		}}
	>
		{@render children()}
	</div>
</div>
