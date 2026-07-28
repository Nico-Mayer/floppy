<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as Dialog from '$lib/components/ui/dialog'
	import { formatBytes } from '$lib/components/transfer/format'
	import { pairing } from '$lib/pairing-app.svelte'
	import { IconDownload, IconX } from '@tabler/icons-svelte'

	// Driven entirely by pairing.incoming: an offer arrives → the dialog opens;
	// accept/decline clears it. Closing by any other means (esc, overlay) counts
	// as declining — an incoming transfer should never be left silently pending.
	const open = $derived(pairing.incoming !== null)

	function onOpenChange(next: boolean) {
		if (!next && pairing.incoming) pairing.decline()
	}

	// A count with the right plural — "1 file" / "3 files".
	function files(n: number) {
		return `${n} ${n === 1 ? 'file' : 'files'}`
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Incoming transfer</Dialog.Title>
			{#if pairing.incoming}
				<Dialog.Description>
					<span class="font-medium text-foreground">{pairing.incoming.fromName}</span>
					wants to send you
					{files(pairing.incoming.fileCount)}
					{#if pairing.incoming.totalBytes > 0}
						· {formatBytes(pairing.incoming.totalBytes)}
					{/if}
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => pairing.decline()}>
				<IconX data-icon="inline-start" />
				Decline
			</Button>
			<Button onclick={() => pairing.accept()}>
				<IconDownload data-icon="inline-start" />
				Accept
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
