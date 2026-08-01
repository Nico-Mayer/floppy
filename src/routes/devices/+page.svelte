<script lang="ts">
	import DeviceList from '$lib/components/devices/DeviceList.svelte'
	import SelfCodeCard from '$lib/components/devices/SelfCodeCard.svelte'
	import SelfDeviceCard from '$lib/components/devices/SelfDeviceCard.svelte'
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { type DeviceInfo } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'

	// The home for your devices: who this device says it is, the code another device
	// can use to reach it, and the devices it already trusts. Both directions of a
	// pairing are on this one screen — show your code, or open the surface that takes
	// theirs (see EnterCodeDialog) — so there is no role to choose.
	//
	// Everything here except adding is a local operation on the trust store, so the
	// page stays usable when pairing cannot reach the broker.

	/** Which row is showing its rename field, and whether this device's is open. */
	let renaming = $state<string | null>(null)
	let renamingSelf = $state(false)

	// --- Remove a paired device (confirm first) ---------------------------------
	// Owned here rather than per row: one dialog for the list, whichever row asked.
	let removing = $state<DeviceInfo | null>(null)

	async function confirmRemove() {
		const device = removing
		removing = null
		if (device) await pairing.untrust(device.fingerprint)
	}

	/**
	 * A pull means "reload this screen", so the screen's transient state goes with
	 * the data: an open inline rename is stale by then, and leaving it sitting there
	 * is what makes the gesture look like it did nothing.
	 *
	 * The shown code deliberately survives a pull. It is live — the other device may
	 * be part-way through typing it — and a stray pull must not invalidate a pairing
	 * in progress. "New code" is the control for that.
	 */
	async function refresh() {
		renaming = null
		renamingSelf = false
		await pairing.refresh()
	}
</script>

<!-- Pull down at the top of the list to reload it from the trust store. The list
     is the one screen in the app with a real reload to perform: the store can be
     changed by the other side of a pairing while this page is open. -->
<PageShell scroll onrefresh={refresh}>
	<PageHeader title="Devices" description="The devices you trust, and the name they see you by." />

	<!-- No separator anywhere on this page: the panel, the code card, and the list
	     already read as different kinds of thing, and a rule between them made the
	     page look like several lists of devices. -->
	<SelfDeviceCard bind:editing={renamingSelf} />

	<SelfCodeCard />

	<DeviceList bind:renaming onremove={(device) => (removing = device)} />
</PageShell>

<!-- Removing a device is destructive (it can't send without a code again), so
     confirm first. Centered dialog on desktop, bottom drawer on mobile. -->
<ResponsiveDialog.Root open={removing !== null} onOpenChange={(next) => !next && (removing = null)}>
	<ResponsiveDialog.Content class="sm:max-w-sm">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Remove {removing?.name}?</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>You'll need a new code to send to it again.</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Footer>
			<Button variant="outline" onclick={() => (removing = null)}>Keep</Button>
			<Button variant="destructive" onclick={confirmRemove}>
				<Trash2Icon data-icon="inline-start" />
				Remove
			</Button>
		</ResponsiveDialog.Footer>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
