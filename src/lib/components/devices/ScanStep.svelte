<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import KeyboardIcon from '@lucide/svelte/icons/keyboard'
	import ScanLineIcon from '@lucide/svelte/icons/scan-line'

	// Reading the other device's QR with the camera. The step exists so the add
	// flow has its real shape and the camera can drop straight into this frame; no
	// scanner is wired up behind it yet.
	//
	// Deliberately no viewfinder imitation and no permission request: a frame that
	// looked like a live camera would be a lie, and asking for the camera to then
	// show nothing spends a permission prompt on one.

	let { onback }: { onback: () => void } = $props()
</script>

<ResponsiveDialog.Header>
	<ResponsiveDialog.Title>Scan their code</ResponsiveDialog.Title>
	<ResponsiveDialog.Description>Hold their code in the frame.</ResponsiveDialog.Description>
</ResponsiveDialog.Header>

<ResponsiveDialog.Body>
	<div
		class="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed bg-muted/40"
	>
		<ScanLineIcon class="size-10 text-muted-foreground" />
	</div>
</ResponsiveDialog.Body>

<ResponsiveDialog.Footer>
	<Button variant="secondary" onclick={onback}>
		<KeyboardIcon data-icon="inline-start" />
		Type their code
	</Button>
</ResponsiveDialog.Footer>
