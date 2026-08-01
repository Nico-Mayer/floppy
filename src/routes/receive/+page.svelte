<script lang="ts">
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import ReceivePanel from '$lib/components/transfer/receive/ReceivePanel.svelte'
	import TransferError from '$lib/components/transfer/TransferError.svelte'
	import { app } from '$lib/transfer-app.svelte'
</script>

<!-- Same shape as /send — see the note there. -->
<PageShell width="wide" pad="tight" gap="none">
	<div class="flex min-h-0 flex-1 flex-col gap-3">
		<TransferError error={app.receive.error} ondismiss={() => (app.receive.error = null)} />
		<div class="min-h-0 flex-1">
			<ReceivePanel />
		</div>
	</div>
</PageShell>
