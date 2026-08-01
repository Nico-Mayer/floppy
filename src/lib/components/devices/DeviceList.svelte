<script lang="ts">
	import DeviceRow from '$lib/components/devices/DeviceRow.svelte'
	import EnterCodeDialog from '$lib/components/devices/EnterCodeDialog.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Item from '$lib/components/ui/item'
	import type { DeviceInfo } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
	import PlusIcon from '@lucide/svelte/icons/plus'

	// The devices you already have, and the way in to using another device's code.
	// This device's own code is the card above, so the two directions of a pairing
	// are both on this screen: show yours, or take theirs.

	let {
		/** Which row is showing its rename field, by fingerprint. Owned here. */
		renaming = $bindable<string | null>(null),
		/** The page owns the confirmation, so removal leaves here as a request. */
		onremove
	}: {
		renaming?: string | null
		onremove: (device: DeviceInfo) => void
	} = $props()

	let entering = $state(false)

	// Taking a code needs the broker; the rest of this page does not. So this is the
	// one control that goes away when pairing is down, and it says why.

	async function rename(fingerprint: string, name: string) {
		renaming = null
		await pairing.rename(fingerprint, name)
	}
</script>

{#snippet addButton(variant: 'default' | 'outline')}
	<Button {variant} size="sm" disabled={!pairing.available} onclick={() => (entering = true)}>
		<PlusIcon data-icon="inline-start" />
		Add Device
	</Button>
{/snippet}

<section class="flex flex-col gap-3">
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 flex-col gap-1">
			<h2 class="text-base font-medium">Your devices</h2>
			{#if !pairing.available}
				<p class="text-sm text-muted-foreground">
					Floppy can't add a device right now. Check your connection, then reopen the app.
				</p>
			{/if}
		</div>
		<!-- Only alongside the list. With nothing paired the empty state carries the
		     button instead, so a first-time user has one obvious thing to press. -->
		{#if pairing.devices.length > 0}
			{@render addButton('outline')}
		{/if}
	</div>

	{#if pairing.devices.length === 0}
		<Empty.Root class="border border-dashed py-8">
			<Empty.Header>
				<Empty.Media variant="icon">
					<MonitorSmartphoneIcon />
				</Empty.Media>
				<Empty.Title>No devices yet</Empty.Title>
				<Empty.Description>
					Show your code above, or use theirs, and you can send without a code from then on.
				</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				{@render addButton('default')}
			</Empty.Content>
		</Empty.Root>
	{:else}
		<Item.Group>
			{#each pairing.devices as device (device.fingerprint)}
				<DeviceRow
					{device}
					renaming={renaming === device.fingerprint}
					onrenamestart={() => (renaming = device.fingerprint)}
					onrenamecancel={() => (renaming = null)}
					onrename={(name) => rename(device.fingerprint, name)}
					onremove={() => onremove(device)}
				/>
			{/each}
		</Item.Group>
	{/if}
</section>

<EnterCodeDialog bind:open={entering} />
