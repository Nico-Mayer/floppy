<script lang="ts">
	import { isCompleteCode } from '$lib/code'
	import CodeInput from '$lib/components/CodeInput.svelte'
	import ScanStep from '$lib/components/devices/ScanStep.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { Spinner } from '$lib/components/ui/spinner'
	import { errorText } from '$lib/errors'
	import { pairing } from '$lib/pairing-app.svelte'
	import { isPhoneChrome } from '$lib/platform'
	import { toast } from 'svelte-sonner'

	// The other half of a pairing: the code the *other* device is showing. This
	// device's own code lives on the page behind this, so the screen offers both
	// directions and neither is a role the user has to pick — this is only the one
	// that needs a keyboard, which is why it gets a surface of its own.

	let { open = $bindable(false) }: { open?: boolean } = $props()

	/** 'code' is the field; 'scan' is the camera step, which takes the surface. */
	let step = $state<'code' | 'scan'>('code')

	let typed = $state('')
	let connecting = $state(false)

	$effect(() => {
		if (open) return
		step = 'code'
		typed = ''
	})

	// A completed pairing is the reason this surface existed, and the new device is
	// already a row in the list behind it.
	let seenPaired = $state(pairing.paired)
	$effect(() => {
		if (pairing.paired === seenPaired) return
		seenPaired = pairing.paired
		open = false
	})

	async function connect() {
		const value = typed.trim()
		if (!isCompleteCode(value) || connecting) return
		connecting = true
		try {
			await pairing.redeemCode(value, 'code')
		} catch (e) {
			toast.error(errorText(e))
		} finally {
			// Clear either way. A code is single-use and short-lived, so once a try
			// has failed the other device has to show a new one. Leaving the dead
			// code sitting there just invites the same failure again.
			typed = ''
			connecting = false
		}
	}
</script>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content class="sm:max-w-sm">
		{#if step === 'scan'}
			<ScanStep onback={() => (step = 'code')} />
		{:else}
			<ResponsiveDialog.Header>
				<ResponsiveDialog.Title>Add Device</ResponsiveDialog.Title>
				<ResponsiveDialog.Description
					>Type the code your other device is showing.</ResponsiveDialog.Description
				>
			</ResponsiveDialog.Header>

			<ResponsiveDialog.Body class="flex flex-col gap-2">
				<!-- Scanning is offered on a phone build only, and it gets its own row
				     there: it is the way you would actually do this holding a phone. Gated
				     on the platform rather than the window width, because a narrow desktop
				     window still has no camera worth pointing at a screen. -->
				{#if isPhoneChrome}
					<Button variant="outline" class="w-full" onclick={() => (step = 'scan')}>Scan it instead</Button>
				{/if}
				<Field.Field>
					<Field.FieldLabel for="pair-code" class="sr-only">Their code</Field.FieldLabel>
					<div class="flex items-center gap-2">
						<div class="flex-1">
							<CodeInput id="pair-code" bind:value={typed} disabled={connecting} onsubmit={connect} />
						</div>
						<Button disabled={!isCompleteCode(typed) || connecting} onclick={connect}>
							{#if connecting}
								<Spinner data-icon="inline-start" />
								Linking…
							{:else}
								Connect
							{/if}
						</Button>
					</div>
				</Field.Field>
			</ResponsiveDialog.Body>
		{/if}
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
