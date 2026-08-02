<script lang="ts">
	import CodePanel from '$lib/components/devices/CodePanel.svelte'
	import DeviceList from '$lib/components/devices/DeviceList.svelte'
	import SelfDeviceCard from '$lib/components/devices/SelfDeviceCard.svelte'
	import BusyButton from '$lib/components/feedback/BusyButton.svelte'
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { type DeviceInfo } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import QrCodeIcon from '@lucide/svelte/icons/qr-code'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'

	// The home for your devices: who this device says it is, and the devices it
	// already trusts. Both directions of a pairing are reachable from here without
	// either being a role the user picks: this device's code is a panel on the
	// heading, and the other device's code is the control beside the list (a camera
	// on a phone, the field on desktop).
	//
	// Everything here except adding is a local operation on the trust store, so the
	// page stays usable when pairing cannot reach the broker.

	/** Which row is showing its rename field, and whether this device's is open. */
	let renaming = $state<string | null>(null)
	let renamingSelf = $state(false)

	/** This device's code, opened from the heading rather than sitting on the page. */
	let showingCode = $state(false)

	// --- Remove a paired device (confirm first) ---------------------------------
	// Owned here rather than per row: one dialog for the list, whichever row asked.
	let removing = $state<DeviceInfo | null>(null)

	// The dialog holds its place while trust is being revoked, its confirm
	// showing the work, and closes once the row is really gone (`feedback`).
	const removePending = $derived(removing !== null && pairing.isPending(`untrust:${removing.fingerprint}`))

	async function confirmRemove() {
		const device = removing
		if (!device || removePending) return
		await pairing.untrust(device.fingerprint)
		removing = null
	}

	/**
	 * A pull means "reload this screen", so the screen's transient state goes with
	 * the data: an open inline rename is stale by then, and leaving it sitting there
	 * is what makes the gesture look like it did nothing.
	 *
	 * There is no code state to reason about here any more: a shown code lives in the
	 * panel, which a pull cannot reach.
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
	<PageHeader title="Devices" description="The devices you trust, and the name they see you by.">
		{#snippet action()}
			<Button
				variant="outline"
				size="icon"
				aria-label="Show your code"
				disabled={!pairing.available}
				onclick={() => (showingCode = true)}
			>
				<QrCodeIcon />
			</Button>
		{/snippet}
	</PageHeader>

	<!-- No separator between the two: the panel and the list already read as
	     different kinds of thing, and a rule between them made the page look like two
	     lists of devices. -->
	<SelfDeviceCard bind:editing={renamingSelf} />

	<DeviceList bind:renaming onremove={(device) => (removing = device)} />
</PageShell>

<CodePanel bind:open={showingCode} />

<!-- Removing a device is destructive (it can't send without a code again), so
     confirm first. Centered dialog on desktop, bottom drawer on mobile. -->
<ResponsiveDialog.Root
	open={removing !== null}
	onOpenChange={(next) => !next && !removePending && (removing = null)}
>
	<ResponsiveDialog.Content class="sm:max-w-sm">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Remove {removing?.name}?</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>You'll need a new code to send to it again.</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Footer>
			<Button variant="outline" disabled={removePending} onclick={() => (removing = null)}>Keep</Button>
			<BusyButton
				variant="destructive"
				pending={removePending}
				pendingLabel="Removing…"
				onclick={confirmRemove}
			>
				<Trash2Icon data-icon="inline-start" />
				Remove
			</BusyButton>
		</ResponsiveDialog.Footer>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
