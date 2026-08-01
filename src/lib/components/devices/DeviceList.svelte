<script lang="ts">
	import DeviceRow from '$lib/components/devices/DeviceRow.svelte'
	import EnterCodeDialog from '$lib/components/devices/EnterCodeDialog.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Item from '$lib/components/ui/item'
	import type { DeviceInfo } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import { canScan, openSettings, scanner } from '$lib/scan.svelte'
	import { PlusIcon, ScanQrCodeIcon } from '@lucide/svelte'
	import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
	import { toast } from 'svelte-sonner'

	// The devices you already have, and the way in to using another device's code.
	// This device's own code is the panel on the page's heading, so the two
	// directions of a pairing are both on this screen: show yours, or take theirs.
	//
	// On a phone, taking theirs means the camera, with no step in between: holding
	// the camera up to the other screen is how a person does this with a phone in
	// their hand. The camera runs behind the app with our own controls over it (see
	// ScanSheet), so stopping it or switching to typing are both one press. On
	// desktop there is no scanner, so it is the code field.

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

	/**
	 * Add a device: the camera on a phone, the code field everywhere else.
	 *
	 * Every way the camera can end without a pairing lands on the field, so there is
	 * no dead end to back out of — a refusal and a cancel are both just "type it
	 * instead", with a word about the camera in the case the user did not choose.
	 */
	async function add() {
		if (!canScan()) {
			entering = true
			return
		}
		// The camera owns the whole attempt, including what a decoded code turns out to
		// mean: it says it caught something, then that it worked, or why it did not and
		// that another code is one aim away. So a redeem failure is its business, not a
		// toast over a closed camera — this only handles the ways it ends without one.
		const outcome = await scanner.run((content) => pairing.redeemCode(content, 'qr'))
		switch (outcome.kind) {
			case 'type':
				entering = true
				return
			case 'denied':
				entering = true
				toast.info('The camera is off. Type their code instead, or turn it on in Settings.', {
					action: { label: 'Settings', onClick: () => void openSettings() }
				})
				return
			case 'failed':
				entering = true
				toast.error(outcome.message)
				return
			default:
				// Paired, or stopped on purpose. Nothing opens: the list behind this
				// already shows the new device, and a stop asked for the app back.
				return
		}
	}
</script>

{#snippet addButton(variant: 'default' | 'outline')}
	<Button {variant} size="sm" disabled={!pairing.available || scanner.active} onclick={add}>
		{#if canScan()}
			<ScanQrCodeIcon class="mr-1" data-icon="inline-start" />
		{:else}
			<PlusIcon data-icon="inline-start" />
		{/if}
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
				<Empty.Description>Add one and you can send to it without a code.</Empty.Description>
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

<EnterCodeDialog bind:open={entering} onscan={add} />
