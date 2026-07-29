<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { formatBytes } from '$lib/components/transfer/format'
	import { pairing } from '$lib/pairing-app.svelte'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import XIcon from '@lucide/svelte/icons/x'

	// Driven entirely by pairing.incoming: an offer arrives → the prompt opens;
	// accept/decline clears it. Closing by any other means (esc, overlay, swipe)
	// counts as declining — an incoming transfer should never be left silently
	// pending. Centered dialog on desktop, bottom drawer on mobile.
	const open = $derived(pairing.incoming !== null)

	function onOpenChange(next: boolean) {
		if (!next && pairing.incoming) pairing.decline()
	}

	// A count with the right plural — "1 file" / "3 files".
	function files(n: number) {
		return `${n} ${n === 1 ? 'file' : 'files'}`
	}
</script>

<ResponsiveDialog.Root {open} {onOpenChange}>
	<ResponsiveDialog.Content class="sm:max-w-sm">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Incoming transfer</ResponsiveDialog.Title>
			{#if pairing.incoming}
				<ResponsiveDialog.Description>
					<span class="font-medium text-foreground">{pairing.incoming.fromName}</span>
					wants to send you
					{files(pairing.incoming.fileCount)}
					{#if pairing.incoming.totalBytes > 0}
						· {formatBytes(pairing.incoming.totalBytes)}
					{/if}
				</ResponsiveDialog.Description>
			{/if}
		</ResponsiveDialog.Header>

		<ResponsiveDialog.Footer>
			<Button variant="outline" onclick={() => pairing.decline()}>
				<XIcon data-icon="inline-start" />
				Decline
			</Button>
			<Button onclick={() => pairing.accept()}>
				<DownloadIcon data-icon="inline-start" />
				Accept
			</Button>
		</ResponsiveDialog.Footer>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
