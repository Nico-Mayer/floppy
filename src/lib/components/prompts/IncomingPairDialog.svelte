<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { pairing } from '$lib/pairing-app.svelte'
	import CheckIcon from '@lucide/svelte/icons/check'
	import XIcon from '@lucide/svelte/icons/x'

	// Driven by pairing.request: a device finished the pairing handshake against a
	// code this device is showing, and waits here for a yes/no plus a name. Trust
	// is written only on confirm; closing by any other means declines it.
	const open = $derived(pairing.request !== null)

	// The name field, seeded from the peer's suggestion whenever a new request
	// arrives. Keyed on the request so reopening for a different device re-seeds.
	let name = $state('')
	$effect(() => {
		if (pairing.request) name = pairing.request.suggestedName
	})

	function onOpenChange(next: boolean) {
		if (!next && pairing.request) pairing.dismissPair()
	}

	// A blank name would trust the device under an unidentifiable label, so the
	// name is required here just as it is on the pair page.
	const nameOk = $derived(name.trim().length > 0)

	function confirm() {
		if (!nameOk) return
		pairing.confirmPair(name.trim())
	}
</script>

<ResponsiveDialog.Root {open} {onOpenChange}>
	<!-- data-layer: this arrives unasked and has to be seen over whatever the user
	     had open, whichever mounted its portal first. See the scale in layout.css. -->
	<ResponsiveDialog.Content class="sm:max-w-sm" data-layer="prompt">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Add this device?</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				A device used your code to link. It's called
				<span class="font-medium text-foreground">{pairing.request?.suggestedName}</span>. Add it to send
				without a code, or rename it below.
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>

		<ResponsiveDialog.Body class="flex flex-col gap-3">
			<Input
				bind:value={name}
				placeholder="Device name"
				aria-label="Device name"
				onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && confirm()}
			/>
			<!-- A typed code carries less entropy than a scanned QR, so show the SAS
			     to compare. A scanned QR delivered the secret out of band, so there's
			     nothing left to check. -->
			{#if pairing.request?.via === 'code' && pairing.request?.sas}
				<p class="text-center text-sm text-muted-foreground">
					Make sure both devices show
					<span class="font-mono font-medium text-foreground">{pairing.request.sas}</span>
				</p>
			{/if}
		</ResponsiveDialog.Body>

		<!-- Same treatment as the incoming-transfer prompt: 16px between the two
		     actions on a phone, where the footer stacks and decline would otherwise
		     sit 8px from a trust decision. -->
		<ResponsiveDialog.Footer class="max-sm:gap-4">
			<Button variant="outline" onclick={() => pairing.dismissPair()}>
				<XIcon data-icon="inline-start" />
				Not now
			</Button>
			<Button onclick={confirm} disabled={!nameOk}>
				<CheckIcon data-icon="inline-start" />
				Add
			</Button>
		</ResponsiveDialog.Footer>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
