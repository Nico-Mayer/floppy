<script lang="ts">
	import { OpenPath } from '$lib/ipc'
	import { Button } from '$lib/components/ui/button'
	import { isPhoneChrome } from '$lib/platform'
	import { app } from '$lib/transfer-app.svelte'
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open'
	import XIcon from '@lucide/svelte/icons/x'
	import { currentFile } from '../format'
	import TransferCard from '../TransferCard.svelte'
	import TransferProgress from '../TransferProgress.svelte'
	import TransferComplete from '$lib/components/feedback/TransferComplete.svelte'
	import ReceiveCodeForm from './ReceiveCodeForm.svelte'
	import ReceiveDevice from './ReceiveDevice.svelte'
	import ReceiveIdle from './ReceiveIdle.svelte'
	import ReceiveSearching from './ReceiveSearching.svelte'

	const receive = app.receive
</script>

<TransferCard accent="receive">
	<!-- One screen per state of the receive flow — see ./labels.ts for the table
	     the branches follow. Only 'connecting' differs by target. -->
	{#if receive.status === 'cancelling'}
		<TransferProgress label="Stopping…" />
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
			label={currentFile(receive.stats) || 'Getting your files…'}
		/>
	{:else if receive.status === 'done'}
		<TransferComplete
			title={receive.target.kind === 'device' ? `Got them from ${receive.target.name}` : 'All done'}
			description={receive.savedTo}
			mono
		/>
	{:else}
		<ReceiveIdle />
	{/if}

	<!-- Every state that can be left offers the way out from here, so the exit is
	     always in the same place. 'cancelling' is the one dead end, and it is
	     already on its way to idle. -->
	{#snippet actions()}
		{#if receive.status === 'done'}
			<!-- Desktop reveals the destination in a file manager. On mobile the
			     files land in the system-visible location (Android public Downloads,
			     iOS Files → On My iPhone → Floppy), reachable from the OS file apps;
			     there is no reliable in-app intent to jump there, so the button is
			     hidden and "Get more files" carries the flow. The path is still
			     shown by the completion screen. -->
			{#if !isPhoneChrome}
				<Button onclick={() => OpenPath(receive.savedTo)}>
					<FolderOpenIcon />
					Open folder
				</Button>
			{/if}
			<!-- touch="grow": on a phone this is the only way forward from the done
			     state (Open folder is hidden there), so it is the primary action, which
			     the size alone cannot tell us. -->
			<Button variant="outline" size="sm" touch="grow" onclick={() => receive.reset()}>Get more files</Button>
		{:else if receive.status === 'connecting' || receive.status === 'receiving'}
			<Button variant="destructive" size="sm" onclick={() => receive.cancel()}>
				<XIcon />
				Cancel
			</Button>
		{:else if receive.status === 'idle'}
			<ReceiveCodeForm />
		{/if}
	{/snippet}
</TransferCard>
