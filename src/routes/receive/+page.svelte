<script lang="ts">
	import ConnectionWarning from '$lib/components/shell/ConnectionWarning.svelte'
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import ReceivePanel from '$lib/components/transfer/receive/ReceivePanel.svelte'
	import { receiveHeadline } from '$lib/components/transfer/receive/labels'
	import TransferError from '$lib/components/transfer/TransferError.svelte'
	import { app } from '$lib/transfer-app.svelte'

	const receive = app.receive

	// The top bar's live status — same shape as /send, see the note there.
	const status = $derived(receiveHeadline(receive.status, receive.target))
</script>

<!-- The heading's trailing slot, same component and same wording as /send: one
     quiet icon while a connection is missing, nothing otherwise. -->
{#snippet headerIndicators()}
	<div class="flex items-center gap-2">
		<ConnectionWarning />
	</div>
{/snippet}

<!-- Same shape as /send — see the note there. -->
<PageShell width="wide" pad="tight" gap="none">
	<div class="flex min-h-0 flex-1 flex-col gap-3">
		<PageHeader title="Receive" accent="receive" {status} action={headerIndicators} />
		<TransferError error={receive.error} ondismiss={() => (receive.error = null)} />
		<div class="min-h-0 flex-1">
			<ReceivePanel />
		</div>
	</div>
</PageShell>
