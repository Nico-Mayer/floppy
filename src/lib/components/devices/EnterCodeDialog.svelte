<script lang="ts">
	import { isCompleteCode } from '$lib/code'
	import CodeInput from '$lib/components/CodeInput.svelte'
	import BusyButton from '$lib/components/feedback/BusyButton.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { errorText } from '$lib/errors'
	import { fast } from '$lib/motion'
	import { pairing } from '$lib/pairing-app.svelte'
	import { canScan } from '$lib/scan.svelte'
	import CameraIcon from '@lucide/svelte/icons/camera'
	import { fade } from 'svelte/transition'

	// Typing the code the *other* device is showing.
	//
	// On a phone this is the fallback the camera lands on: cancelled, refused, or
	// broken, the user ends up here with something to do. On desktop it is the whole
	// of adding a device. Either way it offers the way back to the camera, so neither
	// direction is a one-way door.

	let { open = $bindable(false), onscan }: { open?: boolean; onscan?: () => void } = $props()

	let typed = $state('')
	let connecting = $state(false)
	/** The last attempt's failure. Inline — this surface is the flow the user is inside. */
	let error = $state('')

	$effect(() => {
		if (!open) {
			typed = ''
			error = ''
		}
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
		error = ''
		try {
			await pairing.redeemCode(value, 'code')
		} catch (e) {
			error = errorText(e)
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
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Use their code</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>Type the code your other device is showing.</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>

		<ResponsiveDialog.Body class="flex flex-col gap-2">
			<Field.Field>
				<Field.FieldLabel for="pair-code" class="sr-only">Their code</Field.FieldLabel>
				<div class="flex items-center gap-2">
					<div class="flex-1">
						<CodeInput id="pair-code" bind:value={typed} disabled={connecting} onsubmit={connect} />
					</div>
					<BusyButton
						pending={connecting}
						pendingLabel="Linking…"
						disabled={!isCompleteCode(typed)}
						onclick={connect}
					>
						Connect
					</BusyButton>
				</div>
			</Field.Field>

			{#if error}
				<p class="text-sm text-destructive" transition:fade={{ duration: fast() }}>{error}</p>
			{/if}

			<!-- The way back to the camera, where there is one. Quiet, because someone
			     who is here either chose to type or just came from the scanner. -->
			{#if canScan() && onscan}
				<Button
					variant="ghost"
					size="sm"
					class="self-start"
					onclick={() => {
						open = false
						onscan?.()
					}}
				>
					<CameraIcon data-icon="inline-start" />
					Scan it instead
				</Button>
			{/if}
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
