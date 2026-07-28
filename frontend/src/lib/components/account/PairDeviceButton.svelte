<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { pairing } from '$lib/pairing-app.svelte'
	import { IconDevicesPlus } from '@tabler/icons-svelte'
	import AddDeviceDialog from './AddDeviceDialog.svelte'

	/**
	 * The pairing entry point, wherever pairing is worth mentioning — it carries
	 * its own dialog so a surface only has to place the button. Pairing used to be
	 * reachable only from the account sheet's devices view, three taps behind an
	 * avatar that reads as "sign in", which left the feature invisible to anyone
	 * who had not already used it.
	 *
	 * Renders nothing when the pairing backend did not come up: an offer to pair
	 * that cannot pair is worse than no offer at all. The devices view is the one
	 * place that says so out loud, because that is where the user went looking.
	 */
	let {
		label = 'Pair a device',
		iconOnly = false,
		class: className
	}: { label?: string; iconOnly?: boolean; class?: string } = $props()

	let open = $state(false)
</script>

{#if pairing.available}
	{#if iconOnly}
		<!-- The label survives as the accessible name and the tooltip, so the
		     control is still self-describing without spending a row on prose. -->
		<Tooltip.Provider delayDuration={150}>
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon"
							class={className}
							aria-label={label}
							onclick={() => (open = true)}
						>
							<IconDevicesPlus />
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>{label}</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{:else}
		<Button variant="link" size="sm" class={className} onclick={() => (open = true)}>
			<IconDevicesPlus data-icon="inline-start" />
			{label}
		</Button>
	{/if}

	<AddDeviceDialog bind:open />
{/if}
