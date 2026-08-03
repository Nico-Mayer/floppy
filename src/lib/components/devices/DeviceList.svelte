<script lang="ts">
	import DeviceRow from '$lib/components/devices/DeviceRow.svelte'
	import EnterCodeDialog from '$lib/components/devices/EnterCodeDialog.svelte'
	import BlockedReason from '$lib/components/feedback/BlockedReason.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Item from '$lib/components/ui/item'
	import { Skeleton } from '$lib/components/ui/skeleton'
	import { parseScanned } from '$lib/code-link'
	import type { DeviceInfo } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import type { ScanCopy, ScanWait } from '$lib/scan.svelte'
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
	/** The code a `floppy://pair` link brought, handed to the dialog and let go of. */
	let linked = $state('')

	// A pairing link opened the app: open the code field with the code in it. Taken
	// off the store as it is read, so closing the dialog and opening it again by hand
	// does not bring the old code back, and the same link arriving twice still works.
	$effect(() => {
		if (!pairing.pendingCode) return
		linked = pairing.pendingCode
		pairing.pendingCode = ''
		entering = true
	})

	/** What the camera says while it is adding a device. */
	const PAIR_COPY: ScanCopy = {
		aim: {
			headline: 'Point at the code on your other device',
			hint: 'Open Devices there and press the code button to show it.'
		},
		caught: {
			headline: 'Got that. Asking them to link…',
			hint: 'They just have to say yes.',
			slow: 'Still waiting. Someone has to say yes on that device.'
		},
		done: { headline: 'Added', hint: 'You can send to it without a code from now on.' }
	}

	/**
	 * Redeeming resolves when the other device's user says yes, so the wait is however
	 * long someone takes to look at their phone. The core bounds it at two minutes;
	 * that is the right bound for a pairing and the wrong one for a person holding a
	 * camera up, so this gives up sooner and hands them the code field instead.
	 *
	 * Giving up does not cancel the redemption in the core. If the other device says
	 * yes afterwards, the pairing still completes and the list still gains the row —
	 * the `pairing:paired` event does not care who is looking.
	 */
	const PAIR_WAIT: ScanWait = {
		slow: 12_000,
		limit: 45_000,
		gaveUp: "That device hasn't answered. Try again, or type the code."
	}

	// The rows already there once the list has loaded. A row that joins
	// afterwards — a pairing completing — is seen arriving under the shared
	// treatment; an initial render is calm (`interaction`). Taken after the
	// first loaded render (so those rows test against a null baseline and stay
	// calm), and even when that render is the empty state, so the very first
	// device ever paired still arrives marked.
	let baseline: Set<string> | null = null
	$effect(() => {
		if (pairing.loaded && baseline === null) {
			baseline = new Set(pairing.devices.map((d) => d.fingerprint))
		}
	})
	function arrived(fingerprint: string): boolean {
		return baseline !== null && !baseline.has(fingerprint)
	}

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
		const outcome = await scanner.run({ handle: pair, copy: PAIR_COPY, wait: PAIR_WAIT })
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

	/**
	 * What a code read here means. A pairing QR carries a link and a code typed or
	 * printed anywhere else is bare, so both are the same pairing; a share code read
	 * here is a real code on the wrong screen, and saying which screen it belongs to
	 * is more use than "that code didn't work". Throwing keeps the camera live, which
	 * is where the fix is.
	 */
	async function pair(content: string) {
		const scanned = parseScanned(content)
		if (!scanned) throw new Error("That's not a Floppy code. Point at the code on the other device.")
		if (scanned.kind === 'receive') {
			throw new Error("That's a code for sending files. Use it on the Receive screen.")
		}
		await pairing.redeemCode(scanned.code, 'qr')
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
			{#if pairing.loaded && !pairing.available}
				<BlockedReason
					label="Floppy can't add a device right now. Check your connection, then reopen the app."
				/>
			{/if}
		</div>
		<!-- Only alongside the list. With nothing paired the empty state carries the
		     button instead, so a first-time user has one obvious thing to press. -->
		{#if pairing.devices.length > 0}
			{@render addButton('outline')}
		{/if}
	</div>

	{#if !pairing.loaded}
		<!-- The list is still on its way, so it shows its shape: placeholder rows
		     resembling the device rows, not a centred spinner (`interaction`). -->
		<Item.Group aria-hidden="true">
			{#each [0, 1] as row (row)}
				<Item.Root variant="outline" size="sm">
					<Skeleton class="size-8 rounded-lg" />
					<Item.Content>
						<Skeleton class="h-4 w-36 max-w-full" />
					</Item.Content>
				</Item.Root>
			{/each}
		</Item.Group>
	{:else if pairing.devices.length === 0}
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
					arrived={arrived(device.fingerprint)}
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

<EnterCodeDialog bind:open={entering} prefill={linked} onscan={add} />
