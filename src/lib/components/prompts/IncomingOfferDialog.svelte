<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { formatBytes } from '$lib/components/transfer/format'
	import { haptics } from '$lib/haptics'
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
	<!-- data-layer: this arrives unasked and has to be seen over whatever the user
	     had open, the running camera included. See the scale in layout.css. -->
	<ResponsiveDialog.Content class="sm:max-w-sm" data-layer="prompt">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Incoming files</ResponsiveDialog.Title>
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

		<!-- Accepting an incoming transfer is the most consequential tap in the app,
		     and on a phone this footer stacks, which puts decline directly in the
		     thumb's path to it. Both actions reach 44px on a coarse pointer from the
		     default size, so what is left is separation: 16px between them on a
		     phone instead of the stock 8px. Accept stays the last child, so it sits
		     closest to the thumb. -->
		<ResponsiveDialog.Footer class="max-sm:gap-4">
			<Button
				variant="outline"
				onclick={() => {
					void haptics.declined()
					pairing.decline()
				}}
			>
				<XIcon data-icon="inline-start" />
				No thanks
			</Button>
			<Button
				onclick={() => {
					void haptics.accepted()
					pairing.accept()
				}}
			>
				<DownloadIcon data-icon="inline-start" />
				Accept
			</Button>
		</ResponsiveDialog.Footer>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
