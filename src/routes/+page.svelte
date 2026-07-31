<script lang="ts">
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import ModeSwitcher from '$lib/components/transfer/ModeSwitcher.svelte'
	import ReceivePanel from '$lib/components/transfer/receive/ReceivePanel.svelte'
	import SendPanel from '$lib/components/transfer/send/SendPanel.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Tabs from '$lib/components/ui/tabs'
	import { horizontalSwipe, notEdgeStrip } from '$lib/actions/horizontal-swipe.svelte'
	import { haptics } from '$lib/haptics'
	import { fast, motionOK, normal, shift } from '$lib/motion'
	import { isTouch } from '$lib/platform'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { fly } from 'svelte/transition'

	// The two modes as a pager: swiping left goes to the next one, right to the
	// previous, and there is nothing past either end. Tapping the switcher and the
	// keyboard shortcuts are unchanged and land on the same state.
	const MODES: Mode[] = ['send', 'receive']
	const index = $derived(MODES.indexOf(app.mode))

	// How far the panel has been dragged, and which way the next one arrives from.
	let dragX = $state(0)
	let enterDir = $state(1)

	// Direction is derived from the mode actually changing, not from the gesture,
	// so a tap and a shortcut animate correctly too. Those paths never touch the
	// pager, and one of them (the shortcut) sets app.mode directly without going
	// through the tabs' onValueChange.
	// Seeded on the first run rather than at declaration: reading a $derived out
	// here would capture only its initial value.
	let previous: number | null = null
	$effect(() => {
		if (previous !== null && index !== previous) {
			enterDir = index > previous ? 1 : -1
		}
		previous = index
	})

	/** Where a drag of this direction would land, or null at the ends. */
	function targetFor(direction: -1 | 1): Mode | null {
		// Dragging left (-1) reveals what is to the right, i.e. the next mode.
		return MODES[index - direction] ?? null
	}

	function onProgress(dx: number) {
		// Resist hard when there is nothing to reveal, so the end of the range is
		// felt rather than just refused on release.
		const resistance = targetFor(dx < 0 ? -1 : 1) ? 0.5 : 0.12
		dragX = dx * resistance
	}

	function onCommit(direction: -1 | 1) {
		dragX = 0
		const target = targetFor(direction)
		// Only a real change is felt. A swipe that springs back at the end of the
		// range committed nothing, so it gets nothing.
		if (target) {
			app.mode = target
			void haptics.modeChanged()
		}
	}
</script>

<!-- Full-bleed on a phone: PageShell owns the one gutter and the card dissolves
     its own chrome and padding into it (see TransferCard), so content spans the
     width instead of sitting in a floating box. `tight` padding buys the card
     back its vertical room, and the shell's --safe-bottom inset clears the
     gesture bar. Desktop keeps the centered, padded card.
     gap="none": the tab root below owns the spacing between its own children,
     and this route has only that one child. -->
<PageShell width="wide" pad="tight" gap="none">
	<Tabs.Root
		value={app.mode}
		onValueChange={(value) => (app.mode = value as Mode)}
		class="flex min-h-0 flex-1 flex-col gap-3"
	>
		<ModeSwitcher />

		{#if app.error}
			<div transition:fly={{ y: -shift(), duration: normal() }}>
				<Alert.Root variant="destructive" class="animate-shake">
					<CircleAlertIcon />
					<Alert.Title>{app.error.title}</Alert.Title>
					<!-- detail holds the transport's original wording whenever we replaced
						     it with something friendlier; surface it on hover rather than
						     throwing raw text at the user. -->
					<Alert.Description title={app.error.detail}>
						{app.error.message}
					</Alert.Description>
					<Alert.Action>
						<Button variant="ghost" size="icon-xs" onclick={() => (app.error = null)} aria-label="Dismiss">
							<XIcon />
						</Button>
					</Alert.Action>
				</Alert.Root>
			</div>
		{/if}

		<!-- The pager surface. The left edge strip stays the drawer's (notEdgeStrip),
		     and a vertical drag is released to whatever scrolls underneath — which is
		     what keeps this safe over the send queue's own scroller.
		     Only the active panel is mounted, so the drag translates that one rather
		     than sliding two side by side; the incoming panel arrives with the
		     directional transition below. -->
		<div
			class="flex min-h-0 flex-1 flex-col"
			style={dragX ? `transform: translateX(${dragX}px)` : undefined}
			class:transition-transform={dragX === 0}
			use:horizontalSwipe={{
				claim: notEdgeStrip,
				enabled: isTouch(),
				onProgress,
				onCommit,
				onCancel: () => (dragX = 0)
			}}
		>
			<Tabs.Content value="send" class="min-h-0 flex-1">
				{#if motionOK()}
					<div class="h-full" in:fly={{ x: enterDir * shift() * 3, duration: fast() }}>
						<SendPanel />
					</div>
				{:else}
					<SendPanel />
				{/if}
			</Tabs.Content>

			<Tabs.Content value="receive" class="min-h-0 flex-1">
				{#if motionOK()}
					<div class="h-full" in:fly={{ x: enterDir * shift() * 3, duration: fast() }}>
						<ReceivePanel />
					</div>
				{:else}
					<ReceivePanel />
				{/if}
			</Tabs.Content>
		</div>
	</Tabs.Root>
</PageShell>
