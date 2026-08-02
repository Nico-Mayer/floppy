<script lang="ts">
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

<!-- Same shape as /send — see the note there. -->
<PageShell width="wide" pad="tight" gap="none">
	<div class="flex min-h-0 flex-1 flex-col gap-3">
		<PageHeader title="Receive" accent="receive" {status} />
		<TransferError error={receive.error} ondismiss={() => (receive.error = null)} />
		<div class="min-h-0 flex-1">
			<ReceivePanel />
		</div>
	</div>
</PageShell>
