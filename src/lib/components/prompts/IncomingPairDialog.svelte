<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { pairing } from '$lib/pairing-app.svelte'
	import CheckIcon from '@lucide/svelte/icons/check'
	import XIcon from '@lucide/svelte/icons/x'

	// Driven by pairing.request: a device finished the pairing handshake against a
	// code this device is showing, and waits here for a yes or a no. Trust is written
	// only on confirm; closing by any other means declines it.
	//
	// One question, two answers, no field. The device arrives with a name it suggested
	// for itself, which is nearly always the right one, and every row in the list
	// renames inline — so the field asked for a decision the user had not made and
	// could already change a moment later.
	//
	// It also made this the one surface in the app that opens unasked and holds a text
	// input, which on a phone means the keyboard arriving with it: over a bottom sheet,
	// with vaul resizing the panel and keepFocusVisible scrolling underneath it. That
	// was worked around twice, by declining autofocus and then by placing focus
	// somewhere harmless, and both were the wrong shape of answer. A prompt with no
	// field cannot raise a keyboard at all.
	const open = $derived(pairing.request !== null)

	function onOpenChange(next: boolean) {
		if (!next && pairing.request) pairing.dismissPair()
	}

	// The suggested name is the name. Trust is still never written under a blank one:
	// the core sends what the peer calls itself, and the list is where it gets changed.
	function confirm() {
		const req = pairing.request
		if (req) void pairing.confirmPair(req.suggestedName)
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
				<span class="font-medium text-foreground">{pairing.request?.suggestedName}</span>. Add it and you can
				send to it without a code.
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>

		<!-- A typed code carries less entropy than a scanned QR, so show the SAS to
		     compare. A scanned QR delivered the secret out of band, so there's nothing
		     left to check, and the prompt is then the header and the two answers. -->
		{#if pairing.request?.via === 'code' && pairing.request?.sas}
			<ResponsiveDialog.Body>
				<p class="text-center text-sm text-muted-foreground">
					Make sure both devices show
					<span class="font-mono font-medium text-foreground">{pairing.request.sas}</span>
				</p>
			</ResponsiveDialog.Body>
		{/if}

		<!-- Same treatment as the incoming-transfer prompt: 16px between the two
		     actions on a phone, where the footer stacks and decline would otherwise
		     sit 8px from a trust decision. -->
		<ResponsiveDialog.Footer class="max-sm:gap-4">
			<Button variant="outline" onclick={() => pairing.dismissPair()}>
				<XIcon data-icon="inline-start" />
				Not now
			</Button>
			<Button onclick={confirm}>
				<CheckIcon data-icon="inline-start" />
				Add
			</Button>
		</ResponsiveDialog.Footer>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
