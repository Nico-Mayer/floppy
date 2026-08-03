<script lang="ts">
	import PendingHint from '$lib/components/feedback/PendingHint.svelte'
	import TransferComplete from '$lib/components/feedback/TransferComplete.svelte'
	import { Button } from '$lib/components/ui/button'
	import { fast } from '$lib/motion'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import QrCodeIcon from '@lucide/svelte/icons/qr-code'
	import SendIcon from '@lucide/svelte/icons/send'
	import XIcon from '@lucide/svelte/icons/x'
	import { fade } from 'svelte/transition'
	import { currentFile, fileLabel } from '../format'
	import TransferCard from '../TransferCard.svelte'
	import TransferProgress from '../TransferProgress.svelte'
	import AddFilesButton from './AddFilesButton.svelte'
	import SendCode from './SendCode.svelte'
	import SendDevice from './SendDevice.svelte'
	import SendQueue from './SendQueue.svelte'
	import SendTargetPicker from './SendTargetPicker.svelte'

	const send = app.send

	// Un-trusting the chosen device falls the picker back to the code send. Derived
	// rather than corrected in an $effect, so there is no moment where the picked
	// value names a device that is no longer there.
	const selection = $derived(
		send.picked !== 'code' && !pairing.devices.some((d) => d.fingerprint === send.picked)
			? 'code'
			: send.picked
	)

	// Send is an icon button, so the glyph is the only thing on it and the label is
	// the only thing a screen reader gets. Both come off `selection` — the same
	// value dispatchSend branches on — so the button can never show one kind of
	// send and start the other, including when an un-trusted device drops the
	// selection back to the code target.
	const sendLabel = $derived(
		selection === 'code'
			? 'Show the code'
			: `Send to ${pairing.devices.find((d) => d.fingerprint === selection)?.name ?? 'your device'}`
	)

	// Through fileLabel for the same reason the progress line is: this stands in for the
	// filename before any progress has been reported, and again in the completion title.
	const summary = $derived(
		send.files.length === 1 ? fileLabel(send.files[0].name) : `${send.files.length} files`
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

<!-- Only this card accepts dropped files, and only while the queue is still
     editable. +page.svelte resolves a drop against the [data-file-drop-target]
     under the cursor, so dropping onto the rest of the window (or onto a
     running transfer) is refused with a toast instead of silently appending. -->
<TransferCard accent="send" dropTarget={send.status === 'idle'}>
	<!-- One screen per state of the send flow — see ./labels.ts for the table the
	     branches follow. Only 'starting' and 'waiting' differ by target. -->
	{#if send.status === 'idle'}
		<!-- The relative box the floating add button positions against. It spans the
		     status zone, so the button lands above the anchored action zone instead
		     of on top of Send, and it sits outside the queue's own scrolling
		     element so the button does not scroll away with the tiles.
		     Idle only: every other state has an uneditable queue and nothing to add
		     to. -->
		<div class="relative flex min-h-0 flex-1 flex-col">
			<SendQueue />
			<AddFilesButton />
		</div>
	{:else if send.status === 'cancelling'}
		<TransferProgress label="Stopping…" />
	{:else if send.status === 'starting'}
		{#if send.target.kind === 'device'}
			<SendDevice name={send.target.name} accepted={false} />
		{:else}
			<TransferProgress label="Preparing your files" />
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
			     one's height — which is the same height, and has to stay that way: the
			     pill below and PendingHint's `pill` variant both say
			     h-12 / pointer-coarse:h-14, and changing one without the other is what
			     would make the queue jump when a pick starts. -->
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
					     The pill variant carries the send pill's own height
					     (h-12 / pointer-coarse:h-14), so the grid cell is the same height in
					     both shapes and the crossfade moves nothing. -->
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
					     last tile).
					     One pill rather than two bordered boxes with a gap: the sentence reads
					     as one bar, and the picker inside it drops its own chrome to keep it
					     that way (see SendTargetPicker). The height is definite so the picker
					     can fill it with h-full, and it is the number PendingHint's pill
					     variant matches — see the note on the grid cell above.
					     Send is icon-only: the card title already says Send, and the glyph
					     says something the word cannot, which is whether this hands files to a
					     device or puts a code on screen. -->
					<div
						class="flex h-12 items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 shadow-sm backdrop-blur-sm pointer-coarse:h-14"
						transition:fade={{ duration: fast() }}
					>
						<SendTargetPicker bind:value={() => selection, (next) => (send.picked = next)} />
						<Button size="icon-lg" touch="grow" aria-label={sendLabel} onclick={dispatchSend}>
							{#if selection === 'code'}
								<QrCodeIcon class="size-5" />
							{:else}
								<SendIcon class="size-5" />
							{/if}
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
			<Button variant="outline" size="sm" touch="grow" onclick={() => send.reset()}>Send more files</Button>
		{/if}
	{/snippet}
</TransferCard>
