<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Item from '$lib/components/ui/item'
	import { Separator } from '$lib/components/ui/separator'
	import { Textarea } from '$lib/components/ui/textarea'
	import { Clipboard } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import { cn } from '$lib/utils'
	import CheckIcon from '@lucide/svelte/icons/check'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import EyeIcon from '@lucide/svelte/icons/eye'
	import EyeOffIcon from '@lucide/svelte/icons/eye-off'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
	import PencilIcon from '@lucide/svelte/icons/pencil'
	import QrCodeIcon from '@lucide/svelte/icons/qr-code'
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'
	import XIcon from '@lucide/svelte/icons/x'
	import { toast } from 'svelte-sonner'

	// One-sided pairing: show a link on one device, open it on the other, and both
	// end up trusted. This page is the single home for it — no dialog.
	let link = $state('')
	let makingLink = $state(false)
	let copied = $state(false)
	let pasted = $state('')
	let opening = $state(false)
	// A name is required before pairing so the device is identifiable in the list.
	let deviceName = $state('')
	const MIN_NAME = 2
	const nameOk = $derived(deviceName.trim().length >= MIN_NAME)
	const nameTooShort = $derived(deviceName.length > 0 && !nameOk)
	// The QR is always in the DOM, blurred behind a veil by default so it isn't
	// exposed to onlookers or a screen-share until the user reveals it.
	let qrHidden = $state(true)
	// Auto-generate a link once pairing is up, so the QR is present without a
	// "show a link" step. Guarded so a failed attempt doesn't loop.
	let autoTried = false
	$effect(() => {
		if (pairing.available && !link && !makingLink && !autoTried) {
			autoTried = true
			showLink()
		}
	})

	// Inline rename of a paired device. Only one edits at a time.
	let editing = $state<string | null>(null)
	let draft = $state('')

	async function showLink() {
		makingLink = true
		copied = false
		qrHidden = true
		try {
			link = await pairing.createLink()
		} catch {
			toast.error("Couldn't make a link. Try again in a moment.")
		} finally {
			makingLink = false
		}
	}

	async function copyLink() {
		try {
			await Clipboard.SetText(link)
			copied = true
			setTimeout(() => (copied = false), 2000)
		} catch {
			toast.error("Couldn't copy that.")
		}
	}

	async function open() {
		if (!pasted.trim() || !nameOk) return
		opening = true
		await pairing.openLink(pasted.trim(), deviceName.trim())
		opening = false
		pasted = ''
		deviceName = ''
	}

	function startRename(fingerprint: string, name: string) {
		editing = fingerprint
		draft = name
	}

	async function saveRename() {
		const fingerprint = editing
		// An empty draft would blank the name; treat it as a cancel instead.
		if (!fingerprint || !draft.trim()) {
			editing = null
			return
		}
		editing = null
		await pairing.rename(fingerprint, draft.trim())
	}
</script>

<div class="h-full overflow-y-auto">
	<div
		class="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 max-sm:pb-[max(--spacing(4),env(safe-area-inset-bottom))] sm:p-6"
	>
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">Pair devices</h1>
			<p class="text-sm text-muted-foreground">
				Link two devices once, then send without a code. Either side can start.
			</p>
		</div>

		{#if !pairing.available}
			<Empty.Root class="border border-dashed py-10">
				<Empty.Header>
					<Empty.Media variant="icon">
						<MonitorSmartphoneIcon />
					</Empty.Media>
					<Empty.Title>Can't pair right now</Empty.Title>
					<Empty.Description>
						Floppy can't get online. Check your connection, then reopen the app.
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<!-- Show a link for the other device to scan or open. -->
			<section class="flex flex-col items-center gap-3 text-center">
				<h2 class="self-start text-base font-medium">Show a link</h2>
				{#if link}
					<!-- The QR is the toggle: click reveals/hides it. overflow-hidden clips
					     the veil to the rounded edge; an eye icon fades in on hover. -->
					<button
						type="button"
						onclick={() => (qrHidden = !qrHidden)}
						aria-label={qrHidden ? 'Show the QR' : 'Hide the QR'}
						aria-pressed={!qrHidden}
						class="group bg-qr-background relative cursor-pointer overflow-hidden rounded-2xl border p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<QRCode value={link} class={cn('size-44', qrHidden && 'select-none')} />
						<!-- The veil blurs itself, not the QR: a `filter` on the svg gets its
						     own layer whose bounds inflate by the blur radius and paint past
						     overflow-hidden. backdrop-filter stays clipped to this box. -->
						<span
							aria-hidden="true"
							class={cn(
								'pointer-events-none absolute inset-0 backdrop-blur-md transition-opacity duration-200',
								!qrHidden && 'opacity-0'
							)}
						></span>
						<span
							class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100"
						>
							<span class="rounded-full bg-background/80 p-2.5 text-foreground shadow-sm backdrop-blur">
								{#if qrHidden}
									<EyeIcon class="size-5" />
								{:else}
									<EyeOffIcon class="size-5" />
								{/if}
							</span>
						</span>
					</button>
					<p class="text-sm text-muted-foreground">
						{qrHidden ? 'Tap to show it, then scan' : 'Scan this on your other device'}, or copy the link and
						open it there. You'll say yes to the device here before it's added.
					</p>
					<div class="flex gap-2">
						<Button variant="secondary" size="sm" onclick={copyLink}>
							{#if copied}
								<CheckIcon data-icon="inline-start" />
								Copied
							{:else}
								<CopyIcon data-icon="inline-start" />
								Copy link
							{/if}
						</Button>
						<Button variant="outline" size="sm" onclick={showLink} disabled={makingLink}>
							<RefreshCwIcon data-icon="inline-start" />
							New link
						</Button>
					</div>
				{:else}
					<Button class="self-start" onclick={showLink} disabled={makingLink}>
						<QrCodeIcon data-icon="inline-start" />
						{makingLink ? 'Making a link…' : 'Show a link'}
					</Button>
				{/if}
			</section>

			<Separator />

			<!-- Open a link shown on another device. -->
			<section class="flex flex-col gap-3">
				<h2 class="text-base font-medium">I have a link</h2>
				<Field.FieldGroup>
					<Field.Field data-invalid={nameTooShort ? true : undefined}>
						<Field.FieldLabel for="device-name">Name this device</Field.FieldLabel>
						<Input
							id="device-name"
							bind:value={deviceName}
							placeholder="e.g. Work laptop"
							aria-invalid={nameTooShort ? true : undefined}
							maxlength={40}
						/>
						<Field.FieldDescription>
							{nameTooShort
								? `A little longer, at least ${MIN_NAME} characters.`
								: `At least ${MIN_NAME} characters. This is the name you'll see in your list.`}
						</Field.FieldDescription>
					</Field.Field>
					<Field.Field data-disabled={!nameOk ? true : undefined}>
						<Field.FieldLabel for="pair-link">Their link</Field.FieldLabel>
						<Textarea
							id="pair-link"
							bind:value={pasted}
							disabled={!nameOk}
							placeholder={nameOk ? 'Paste the link from your other device' : 'Name this device first'}
							class="w-full resize-none font-mono text-xs break-all"
							rows={3}
						/>
						<Field.FieldDescription>
							{nameOk
								? 'Paste the link your other device is showing, then pair.'
								: 'Name this device first, then paste their link.'}
						</Field.FieldDescription>
					</Field.Field>
				</Field.FieldGroup>
				<Button class="self-start" disabled={!pasted.trim() || !nameOk || opening} onclick={open}>
					{opening ? 'Pairing…' : 'Pair'}
				</Button>
			</section>

			<Separator />

			<!-- Trusted devices: send to them without a code; rename or remove here. -->
			<section class="flex flex-col gap-3">
				<h2 class="text-base font-medium">Paired</h2>
				{#if pairing.devices.length === 0}
					<Empty.Root class="border border-dashed py-8">
						<Empty.Header>
							<Empty.Media variant="icon">
								<MonitorSmartphoneIcon />
							</Empty.Media>
							<Empty.Title>No devices yet</Empty.Title>
							<Empty.Description>Pair one above and you can send to it without a code.</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				{:else}
					<Item.Group>
						{#each pairing.devices as device (device.fingerprint)}
							<Item.Root variant="outline" size="sm">
								<Item.Media variant="icon">
									<LaptopIcon />
								</Item.Media>
								{#if editing === device.fingerprint}
									<Item.Content>
										<Input
											bind:value={draft}
											aria-label="Rename {device.name}"
											class="h-8"
											onkeydown={(e: KeyboardEvent) => {
												if (e.key === 'Enter') saveRename()
												if (e.key === 'Escape') editing = null
											}}
										/>
									</Item.Content>
									<Item.Actions>
										<Button
											variant="ghost"
											size="icon"
											aria-label="Cancel rename"
											onclick={() => (editing = null)}
										>
											<XIcon />
										</Button>
										<Button variant="secondary" size="icon" aria-label="Save name" onclick={saveRename}>
											<CheckIcon />
										</Button>
									</Item.Actions>
								{:else}
									<Item.Content>
										<Item.Title class="truncate">{device.name}</Item.Title>
										<Item.Description class="truncate font-mono text-[10px]">
											{device.fingerprint.slice(0, 16)}
										</Item.Description>
									</Item.Content>
									<Item.Actions>
										<Button
											variant="ghost"
											size="icon"
											aria-label="Rename {device.name}"
											onclick={() => startRename(device.fingerprint, device.name)}
										>
											<PencilIcon />
										</Button>
										<Button
											variant="destructive"
											size="icon"
											aria-label="Remove {device.name}"
											onclick={() => pairing.untrust(device.fingerprint)}
										>
											<Trash2Icon />
										</Button>
									</Item.Actions>
								{/if}
							</Item.Root>
						{/each}
					</Item.Group>
				{/if}
			</section>
		{/if}
	</div>
</div>
