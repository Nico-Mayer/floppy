<script lang="ts">
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import SendPanel from '$lib/components/transfer/send/SendPanel.svelte'
	import TransferError from '$lib/components/transfer/TransferError.svelte'
	import { app } from '$lib/transfer-app.svelte'
</script>

<!-- Full-bleed on a phone: PageShell owns the one gutter and the card dissolves
     its own chrome and padding into it (see TransferCard), so content spans the
     width instead of sitting in a floating box. `tight` padding buys the card
     back its vertical room. Desktop keeps the centered, padded card.
     gap="none": the column below owns the spacing between the alert and the
     panel, and this route has only that one child. -->
<PageShell width="wide" pad="tight" gap="none">
	<div class="flex min-h-0 flex-1 flex-col gap-3">
		<TransferError error={app.send.error} ondismiss={() => (app.send.error = null)} />
		<div class="min-h-0 flex-1">
			<SendPanel />
		</div>
	</div>
</PageShell>
