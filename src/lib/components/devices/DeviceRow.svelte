<script lang="ts">
	import InlineRename from '$lib/components/InlineRename.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Item from '$lib/components/ui/item'
	import type { DeviceInfo } from '$lib/ipc'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import PencilIcon from '@lucide/svelte/icons/pencil'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'

	// One paired device: its name, and the two things you can do to the row.
	//
	// Both controls are plain buttons on every pointer type. Remove used to be a
	// swipe on touch, to keep a destructive control away from a thumb aiming at
	// rename; the gesture was worse in practice than the problem it solved. What
	// keeps the thumb safe now is size and the confirmation: `size="icon"` and the
	// destructive variant both grow to 44px on a coarse pointer, and removing a
	// device always asks first.

	let {
		device,
		/** Whether this row is showing its rename field. Owned by the list. */
		renaming = false,
		onrename,
		onrenamestart,
		onrenamecancel,
		onremove
	}: {
		device: DeviceInfo
		renaming?: boolean
		/** Called with the trimmed new name. */
		onrename: (name: string) => void
		onrenamestart: () => void
		onrenamecancel: () => void
		onremove: () => void
	} = $props()

	// Seeded when rename opens, not from the prop: the field is only ever shown in
	// response to that press, and reading the name here would freeze the first one.
	let draft = $state('')

	function startRename() {
		draft = device.name
		onrenamestart()
	}
</script>

<Item.Root variant="outline" size="sm">
	<Item.Media variant="icon">
		<LaptopIcon />
	</Item.Media>
	{#if renaming}
		<Item.Content>
			<InlineRename
				bind:value={draft}
				label="Rename {device.name}"
				onsave={onrename}
				oncancel={onrenamecancel}
			/>
		</Item.Content>
	{:else}
		<Item.Content>
			<Item.Title class="truncate">{device.name}</Item.Title>
		</Item.Content>
		<Item.Actions>
			<Button variant="ghost" size="icon" aria-label="Rename {device.name}" onclick={startRename}>
				<PencilIcon />
			</Button>
			<Button variant="destructive" size="icon" aria-label="Remove {device.name}" onclick={onremove}>
				<Trash2Icon />
			</Button>
		</Item.Actions>
	{/if}
</Item.Root>
