<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import SendIcon from '@lucide/svelte/icons/send'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { currentFile } from '../format'
	import TransferCard from '../TransferCard.svelte'
	import TransferProgress from '../TransferProgress.svelte'
	import { sendBadge, sendHeadline } from './labels'
	import SendCode from './SendCode.svelte'
	import SendComplete from './SendComplete.svelte'
	import SendDevice from './SendDevice.svelte'
	import SendQueue from './SendQueue.svelte'
	import SendTargetPicker from './SendTargetPicker.svelte'

	/** Above this, a transfer is long enough that leaving the app matters. */
	const LARGE_TRANSFER = 2_000_000_000

	const send = app.send

	// What the picker points at — 'code' or a fingerprint. It outlives a transfer
	// on purpose (send twice to the same laptop without re-choosing); send.target
	// is the snapshot of it that the in-flight transfer belongs to.
	let picked = $state('code')

	// Un-trusting the chosen device falls the picker back to the code send. Derived
	// rather than corrected in an $effect, so there is no moment where `picked`
	// names a device that is no longer there.
	const selection = $derived(
		picked !== 'code' && !pairing.devices.some((d) => d.fingerprint === picked) ? 'code' : picked
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
				<Tooltip.Trigger aria-label="Large transfer warning" class="flex text-amber-500">
					<TriangleAlertIcon class="size-4" />
				</Tooltip.Trigger>
				<Tooltip.Content class="max-w-56 text-center">
					Large transfer — keep both devices awake with the app open until it finishes.
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{/if}
{/snippet}

<!-- Only this card accepts dropped files, and only while the queue is still
     editable: Wails resolves a drop against the innermost
     [data-file-drop-target] under the cursor and drops it on the floor when
     there is none, so dropping onto the rest of the window (or onto a running
     transfer) is refused with a no-drop cursor instead of silently appending. -->
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
		<SendQueue />
	{:else if send.status === 'cancelling'}
		<TransferProgress label="Cancelling…" />
	{:else if send.status === 'starting'}
		{#if send.target.kind === 'device'}
			<SendDevice name={send.target.name} accepted={false} />
		{:else}
			<TransferProgress label="Connecting to peer…" />
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
			label="Encrypted · direct peer · {currentFile(send.stats) || summary}"
		/>
	{:else}
		<SendComplete {summary} target={send.target} />
	{/if}

	<!-- Every state that can be left offers the way out from here, so the exit is
	     always in the same place. 'cancelling' is the one dead end, and it is
	     already on its way to idle. -->
	{#snippet actions()}
		{#if send.status === 'idle' && send.files.length > 0}
			<!-- Adding files moved into the queue grid itself (SendQueue's last tile),
			     so this zone holds one primary action and nothing to weigh it against. -->
			<div class="flex flex-col gap-3">
				<SendTargetPicker bind:value={() => selection, (next) => (picked = next)} />
				<Button class="w-full" onclick={dispatchSend}>
					<SendIcon />
					Send
				</Button>
			</div>
		{:else if send.status === 'starting' || send.status === 'waiting' || send.status === 'sending'}
			<!-- Cancelling an offer the peer has not answered yet only stops us
			     waiting: recalling it needs a broker signal that does not exist, so
			     an accept that lands afterwards still starts the transfer. -->
			<Button variant="destructive" size="sm" class="@max-md:min-h-11" onclick={() => send.cancel()}>
				<XIcon />
				Cancel
			</Button>
		{:else if send.status === 'done'}
			<Button variant="outline" size="sm" class="@max-md:min-h-11" onclick={() => send.reset()}>
				New transfer
			</Button>
		{/if}
	{/snippet}
</TransferCard>
