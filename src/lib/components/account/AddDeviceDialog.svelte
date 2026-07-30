<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { Textarea } from '$lib/components/ui/textarea'
	import { Clipboard } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import LinkIcon from '@lucide/svelte/icons/link'
	import QrCodeIcon from '@lucide/svelte/icons/qr-code'
	import { toast } from 'svelte-sonner'

	let { open = $bindable() }: { open: boolean } = $props()

	// One-sided pairing: one device shows a link, the other opens it, and both
	// end up trusted. No second manual step, no code to compare.
	type Mode = 'choose' | 'show' | 'open'
	let mode = $state<Mode>('choose')
	let link = $state('')
	let pasted = $state('')
	let pairing_ = $state(false)
	// Device count when the dialog opened; a pairing bumps it, which closes us.
	let baseline = 0

	async function showLink() {
		mode = 'show'
		link = ''
		try {
			link = await pairing.createLink()
		} catch (e) {
			toast.error(`Could not create a link: ${e}`)
			mode = 'choose'
		}
	}

	async function copyLink() {
		try {
			await Clipboard.SetText(link)
			toast.success('Link copied')
		} catch {
			toast.error('Could not copy')
		}
	}

	async function pair() {
		pairing_ = true
		await pairing.openLink(pasted.trim())
		pairing_ = false
		// Success closes via the effect below (a new trusted device appears);
		// a failure toasted inside openLink leaves the dialog open to retry.
	}

	// A completed pairing (either initiating or opening) grows the device list —
	// close the dialog when that happens.
	$effect(() => {
		if (open && pairing.devices.length > baseline) open = false
	})

	function onOpenChange(next: boolean) {
		open = next
		if (next) {
			baseline = pairing.devices.length
			mode = 'choose'
			link = ''
			pasted = ''
		}
	}
</script>

<ResponsiveDialog.Root bind:open {onOpenChange}>
	<ResponsiveDialog.Content class="sm:max-w-md">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Pair a device</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				Link two devices once — then send with no code. Pair from either side.
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>

		{#if mode === 'choose'}
			<ResponsiveDialog.Body>
				<div class="flex flex-col gap-2">
					<Button variant="outline" class="h-auto justify-start gap-3 py-3" onclick={showLink}>
						<QrCodeIcon class="size-5 shrink-0" />
						<span class="flex flex-col items-start text-left">
							<span class="font-medium">Show a pairing link</span>
							<span class="text-xs text-muted-foreground">Open it on your other device</span>
						</span>
					</Button>
					<Button variant="outline" class="h-auto justify-start gap-3 py-3" onclick={() => (mode = 'open')}>
						<LinkIcon class="size-5 shrink-0" />
						<span class="flex flex-col items-start text-left">
							<span class="font-medium">I have a link</span>
							<span class="text-xs text-muted-foreground">Paste a link from another device</span>
						</span>
					</Button>
				</div>
			</ResponsiveDialog.Body>
		{:else if mode === 'show'}
			<ResponsiveDialog.Body>
				<div class="flex flex-col items-center gap-3 text-center">
					{#if link}
						<QRCode value={link} class="size-48" />
						<p class="text-sm text-muted-foreground">
							Scan this on your other device, or copy the link and open it there. You'll both be paired.
						</p>
						<Button variant="secondary" size="sm" onclick={copyLink}>
							<CopyIcon data-icon="inline-start" />
							Copy link
						</Button>
					{:else}
						<p class="text-sm text-muted-foreground">Creating a link…</p>
					{/if}
				</div>
			</ResponsiveDialog.Body>
			<ResponsiveDialog.Footer>
				<Button variant="outline" onclick={() => (mode = 'choose')}>Back</Button>
			</ResponsiveDialog.Footer>
		{:else}
			<ResponsiveDialog.Body>
				<Field.FieldGroup>
					<Field.Field>
						<Field.FieldLabel for="pair-link">Pairing link</Field.FieldLabel>
						<Textarea
							id="pair-link"
							bind:value={pasted}
							placeholder="Paste the link from your other device"
							class="w-full resize-none font-mono text-xs break-all"
							rows={3}
						/>
					</Field.Field>
				</Field.FieldGroup>
			</ResponsiveDialog.Body>
			<ResponsiveDialog.Footer>
				<Button variant="outline" onclick={() => (mode = 'choose')}>Back</Button>
				<Button disabled={!pasted.trim() || pairing_} onclick={pair}>
					{pairing_ ? 'Pairing…' : 'Pair'}
				</Button>
			</ResponsiveDialog.Footer>
		{/if}
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
