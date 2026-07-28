<script lang="ts">
	import { OpenPath } from '$bindings/floppy/internal/services/fileservice'
	import { Button } from '$lib/components/ui/button'
	import { app } from '$lib/transfer-app.svelte'
	import { IconFolderOpen, IconX } from '@tabler/icons-svelte'
	import { currentFile } from '../format'
	import TransferCard from '../TransferCard.svelte'
	import TransferProgress from '../TransferProgress.svelte'
	import { receiveBadge, receiveHeadline } from './labels'
	import ReceiveCodeForm from './ReceiveCodeForm.svelte'
	import ReceiveComplete from './ReceiveComplete.svelte'
	import ReceiveDevice from './ReceiveDevice.svelte'
	import ReceiveIdle from './ReceiveIdle.svelte'
	import ReceiveSearching from './ReceiveSearching.svelte'

	const receive = app.receive

	const headline = $derived(receiveHeadline(receive.status, receive.target))
	const badge = $derived(receiveBadge(receive.status, receive.target, receive.progress))
</script>

<TransferCard accent="receive" title="Receive" {headline} {badge}>
	<!-- One screen per state of the receive flow — see ./labels.ts for the table
	     the branches follow. Only 'connecting' differs by target. -->
	{#if receive.status === 'cancelling'}
		<TransferProgress label="Cancelling…" />
	{:else if receive.status === 'connecting'}
		{#if receive.target.kind === 'device'}
			<ReceiveDevice
				name={receive.target.name}
				files={receive.target.fileCount}
				totalBytes={receive.target.totalBytes}
			/>
		{:else}
			<ReceiveSearching />
		{/if}
	{:else if receive.status === 'receiving'}
		<TransferProgress
			progress={receive.progress}
			stats={receive.stats}
			label={currentFile(receive.stats) || 'Receiving…'}
		/>
	{:else if receive.status === 'done'}
		<ReceiveComplete savedTo={receive.savedTo} target={receive.target} />
	{:else}
		<ReceiveIdle />
	{/if}

	<!-- Every state that can be left offers the way out from here, so the exit is
	     always in the same place. 'cancelling' is the one dead end, and it is
	     already on its way to idle. -->
	{#snippet actions()}
		{#if receive.status === 'done'}
			<Button class="@max-md:min-h-11" onclick={() => OpenPath(receive.savedTo)}>
				<IconFolderOpen />
				Open folder
			</Button>
			<Button variant="outline" size="sm" class="@max-md:min-h-11" onclick={() => receive.reset()}>
				Receive more
			</Button>
		{:else if receive.status === 'connecting' || receive.status === 'receiving'}
			<Button variant="destructive" size="sm" class="@max-md:min-h-11" onclick={() => receive.cancel()}>
				<IconX />
				Cancel
			</Button>
		{:else if receive.status === 'idle'}
			<ReceiveCodeForm />
		{/if}
	{/snippet}
</TransferCard>
