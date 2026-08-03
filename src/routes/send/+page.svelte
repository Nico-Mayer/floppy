<script lang="ts">
	import ConnectionWarning from '$lib/components/shell/ConnectionWarning.svelte'
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import SendPanel from '$lib/components/transfer/send/SendPanel.svelte'
	import { sendHeadline } from '$lib/components/transfer/send/labels'
	import TransferError from '$lib/components/transfer/TransferError.svelte'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { app } from '$lib/transfer-app.svelte'
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'

	/** Above this, a transfer is long enough that leaving the app matters. */
	const LARGE_TRANSFER = 2_000_000_000

	const send = app.send

	// The top bar's live status: the one sentence saying what is happening. It
	// changes per phase, not per progress tick — the percent lives in the
	// progress display, not up here.
	const status = $derived(sendHeadline(send.status, send.target, send.files.length))
</script>

<!-- The heading's trailing slot. Both indications are quiet, icon-sized, and
     conditional, so on a good day this renders nothing at all. The connection
     warning leads: no connection outranks advice about the transfer itself, and
     neither is dropped to make room for the other. -->
{#snippet headerIndicators()}
	<div class="flex items-center gap-2">
		<ConnectionWarning />
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
	</div>
{/snippet}

<!-- Full-bleed on a phone: PageShell owns the one gutter and the card dissolves
     its own chrome and padding into it (see TransferCard), so content spans the
     width instead of sitting in a floating box. `tight` padding buys the card
     back its vertical room. Desktop keeps the centered, padded card.
     gap="none": the column below owns the spacing between the heading, the
     alert and the panel, and this route has only that one child. -->
<PageShell width="wide" pad="tight" gap="none">
	<div class="flex min-h-0 flex-1 flex-col gap-3">
		<PageHeader title="Send" accent="send" {status} action={headerIndicators} />
		<TransferError error={send.error} ondismiss={() => (send.error = null)} />
		<div class="min-h-0 flex-1">
			<SendPanel />
		</div>
	</div>
</PageShell>
