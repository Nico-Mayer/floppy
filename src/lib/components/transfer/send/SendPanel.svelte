<script lang="ts">
	import PendingHint from '$lib/components/feedback/PendingHint.svelte'
	import TransferComplete from '$lib/components/feedback/TransferComplete.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { fast } from '$lib/motion'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import SendIcon from '@lucide/svelte/icons/send'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { fade } from 'svelte/transition'
	import { currentFile } from '../format'
	import TransferCard from '../TransferCard.svelte'
	import TransferProgress from '../TransferProgress.svelte'
	import AddFilesSheet from './AddFilesSheet.svelte'
	import { sendBadge, sendHeadline } from './labels'
	import SendCode from './SendCode.svelte'
	import SendDevice from './SendDevice.svelte'
	import SendQueue from './SendQueue.svelte'
	import SendTargetPicker from './SendTargetPicker.svelte'

	/** Above this, a transfer is long enough that leaving the app matters. */
	const LARGE_TRANSFER = 2_000_000_000

	const send = app.send

	// Un-trusting the chosen device falls the picker back to the code send. Derived
	// rather than corrected in an $effect, so there is no moment where the picked
	// value names a device that is no longer there.
	const selection = $derived(
		send.picked !== 'code' && !pairing.devices.some((d) => d.fingerprint === send.picked)
			? 'code'
			: send.picked
	)

	const summary = $derived(send.files.length === 1 ? send.files[0].name : `${send.files.length} files`)
	const headline = $derived(sendHeadline(send.status, send.target, send.files.length))
	const badge = $derived(
		sendBadge(
			send.status,
			send.target,
			{ count: send.files.length, totalSize: send.totalSize },
			send.progress
		)
	)

	function dispatchSend() {
		if (selection === 'code') {
			send.start()
		} else {
			pairing.sendTo(
				selection,
				send.files.map((file) => file.path)
			)
		}
	}
</script>

{#snippet largeTransferWarning()}
	{#if send.status === 'idle' && send.totalSize > LARGE_TRANSFER}
		<Tooltip.Provider delayDuration={150}>
			<Tooltip.Root>
				<Tooltip.Trigger aria-label="Big transfer warning" class="flex text-amber-500">
					<TriangleAlertIcon class="size-4" />
				</Tooltip.Trigger>
				<Tooltip.Content class="max-w-56 text-center">
					This one is big. Keep both devices awake and Floppy open until it finishes.
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{/if}
{/snippet}

<!-- Only this card accepts dropped files, and only while the queue is still
     editable. +page.svelte resolves a drop against the [data-file-drop-target]
     under the cursor, so dropping onto the rest of the window (or onto a
     running transfer) is refused with a toast instead of silently appending. -->
<TransferCard
	accent="send"
	title="Send"
	{headline}
	{badge}
	alert={largeTransferWarning}
	dropTarget={send.status === 'idle'}
>
	<!-- One screen per state of the send flow — see ./labels.ts for the table the
	     branches follow. Only 'starting' and 'waiting' differ by target. -->
	{#if send.status === 'idle'}
		<!-- The relative box the floating add button positions against. It spans the
		     status zone, so the button lands above the anchored action zone instead
		     of on top of Send, and it sits outside the queue's own scrolling
		     element so the button does not scroll away with the tiles.
		     Idle only: every other state has an uneditable queue and nothing to add
		     to. AddFilesSheet renders nothing at all off a phone build. -->
		<div class="relative flex min-h-0 flex-1 flex-col">
			<SendQueue />
			<AddFilesSheet />
		</div>
	{:else if send.status === 'cancelling'}
		<TransferProgress label="Stopping…" />
	{:else if send.status === 'starting'}
		{#if send.target.kind === 'device'}
			<SendDevice name={send.target.name} accepted={false} />
		{:else}
			<TransferProgress label="Getting things ready…" />
		{/if}
	{:else if send.status === 'waiting'}
		{#if send.target.kind === 'device'}
			<SendDevice name={send.target.name} accepted={true} />
		{:else}
			<SendCode code={send.code} />
		{/if}
	{:else if send.status === 'sending'}
		<TransferProgress
			progress={send.progress}
			stats={send.stats}
			label={currentFile(send.stats) || summary}
		/>
	{:else}
		<TransferComplete
			title="Sent {summary}"
			description={send.target.kind === 'device' ? `to ${send.target.name}` : ''}
		/>
	{/if}

	<!-- Every state that can be left offers the way out from here, so the exit is
	     always in the same place. 'cancelling' is the one dead end, and it is
	     already on its way to idle. -->
	{#snippet actions()}
		{#if send.status === 'idle' && send.files.length > 0}
			<!-- The idle zone has two shapes, and they swap in place: the send row, and
			     the report that a pick has not come back yet.
			     Only with files queued. A pick over an empty queue reports under the
			     mascot instead (see SendQueue) — there is no Send to block there, and
			     this zone collapses when it renders nothing, so putting the report here
			     would make the whole zone appear and shove the empty card up.
			     One grid cell holds both. A transition needs the outgoing element in the
			     DOM until it finishes, and as two siblings of the flex column that would
			     stack them for the length of the crossfade and shove the queue up a row.
			     Stacked in one cell they overlap instead, and the cell keeps the taller
			     one's height — which is the same height, see the h-9 below. -->
			<div class="grid *:col-start-1 *:row-start-1">
				{#if send.picking}
					<!-- A pick that has not come back yet, which on a phone is seconds and
					     not an instant: iOS takes the picker sheet away before it starts
					     loading what was chosen and says nothing at all until every item is
					     ready. This is the only place the app says so, and it is here
					     because it has to do two things at once. It is the biggest thing on
					     the screen that is not the queue, at the bottom edge where the eye
					     already is after a pick. And it *is* the Send slot, so a send
					     cannot be started over an incomplete queue — no disabled button to
					     keep in step with anything, the control simply is not there yet.
					     Not a button: nothing here is pressable, and a dimmed disabled
					     button would be quieter than the row it replaced, not louder.
					     h-9 plus the coarse-pointer minimum are the Send button's own
					     numbers, so the grid cell is the same height in both shapes and the
					     crossfade moves nothing. -->
					<div transition:fade={{ duration: fast() }}>
						<PendingHint variant="pill" label="getting files ready" />
					</div>
				{:else}
					<!-- One line, not a stack: who the files go to and the button that sends
					     them are one sentence, and the ~110px the stacked version cost is a
					     whole row of tiles in the queue above. The picker takes the leftover
					     width and truncates; Send keeps its content width at the trailing
					     edge, where the thumb is. Adding files is not weighed against Send
					     here either — that moved into the queue grid itself (SendQueue's
					     last tile). -->
					<div class="flex items-center gap-2" transition:fade={{ duration: fast() }}>
						<SendTargetPicker bind:value={() => selection, (next) => (send.picked = next)} />
						<Button onclick={dispatchSend}>
							<SendIcon />
							Send
						</Button>
					</div>
				{/if}
			</div>
		{:else if send.status === 'starting' || send.status === 'waiting' || send.status === 'sending'}
			<!-- Cancelling an offer the peer has not answered yet only stops us
			     waiting: recalling it needs a broker signal that does not exist, so
			     an accept that lands afterwards still starts the transfer. -->
			<Button variant="destructive" size="sm" onclick={() => send.cancel()}>
				<XIcon />
				Cancel
			</Button>
		{:else if send.status === 'done'}
			<!-- touch="grow": this is the only way forward from the done state, so it is
			     the surface's primary action, which the size alone cannot tell us. -->
			<Button variant="outline" size="sm" touch="grow" onclick={() => send.reset()}>
				Send something else
			</Button>
		{/if}
	{/snippet}
</TransferCard>
