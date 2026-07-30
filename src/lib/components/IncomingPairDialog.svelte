<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { pairing } from '$lib/pairing-app.svelte'
	import CheckIcon from '@lucide/svelte/icons/check'
	import XIcon from '@lucide/svelte/icons/x'

	// Driven by pairing.request: a device finished the pairing handshake against a
	// link this device is showing, and waits here for a yes/no plus a name. Trust
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
	<ResponsiveDialog.Content class="sm:max-w-sm">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Add this device?</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				A device paired using your link. Give it a name you'll recognize, then add it to trust it for
				code-free transfers.
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>

		<ResponsiveDialog.Body>
			<Input
				bind:value={name}
				placeholder="Device name"
				aria-label="Device name"
				onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && confirm()}
			/>
		</ResponsiveDialog.Body>

		<ResponsiveDialog.Footer>
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
