<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Item from '$lib/components/ui/item'
	import { Separator } from '$lib/components/ui/separator'
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
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'
	import XIcon from '@lucide/svelte/icons/x'
	import { toast } from 'svelte-sonner'

	// Two devices agree on a short code: one shows it, the other types it (or
	// scans its QR). Both end up trusting each other. This page is the single home
	// for your devices and for adding new ones.

	// --- This device's own name -------------------------------------------------
	let editingSelf = $state(false)
	let selfDraft = $state('')
	function startEditSelf() {
		selfDraft = pairing.selfName
		editingSelf = true
	}
	async function saveSelf() {
		editingSelf = false
		if (selfDraft.trim()) await pairing.setSelfName(selfDraft)
	}

	// --- Show a code ------------------------------------------------------------
	let code = $state('')
	let makingCode = $state(false)
	let copied = $state(false)
	// The QR sits behind a blur veil by default so a code is not exposed to
	// onlookers or a screen-share until the user reveals it.
	let qrHidden = $state(true)
	// Auto-show a code once pairing is up, so the QR is there without an extra
	// step. Guarded so a failed attempt does not loop.
	let autoTried = false
	$effect(() => {
		if (pairing.available && !code && !makingCode && !autoTried) {
			autoTried = true
			showCode()
		}
	})

	async function showCode() {
		makingCode = true
		copied = false
		qrHidden = true
		try {
			code = await pairing.showCode()
		} catch {
			toast.error("Couldn't make a code. Try again in a moment.")
		} finally {
			makingCode = false
		}
	}

	async function copyCode() {
		try {
			await Clipboard.SetText(code)
			copied = true
			setTimeout(() => (copied = false), 2000)
		} catch {
			toast.error("Couldn't copy that.")
		}
	}

	// --- Enter a code -----------------------------------------------------------
	let typed = $state('')
	let connecting = $state(false)
	async function connect() {
		const value = typed.trim()
		if (!value || connecting) return
		connecting = true
		try {
			await pairing.redeemCode(value, 'code')
			typed = ''
		} catch (e) {
			toast.error(`${e}`.replace(/^Error:\s*/, ''))
		} finally {
			connecting = false
		}
	}

	// --- Rename a paired device -------------------------------------------------
	let editing = $state<string | null>(null)
	let draft = $state('')
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
			<h1 class="text-2xl font-semibold tracking-tight">Devices</h1>
			<p class="text-sm text-muted-foreground">
				Link a device once, then send to it without a code. Either side can start.
			</p>
		</div>

		{#if !pairing.available}
			<Empty.Root class="border border-dashed py-10">
				<Empty.Header>
					<Empty.Media variant="icon">
						<MonitorSmartphoneIcon />
					</Empty.Media>
					<Empty.Title>Can't add a device right now</Empty.Title>
					<Empty.Description>
						Floppy can't get online. Check your connection, then reopen the app.
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<!-- This device's own name, shared with peers when you link. -->
			<section class="flex flex-col gap-2">
				<h2 class="text-base font-medium">This device</h2>
				{#if editingSelf}
					<div class="flex items-center gap-2">
						<Input
							bind:value={selfDraft}
							aria-label="Rename this device"
							maxlength={40}
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter') saveSelf()
								if (e.key === 'Escape') editingSelf = false
							}}
						/>
						<Button variant="ghost" size="icon" aria-label="Cancel" onclick={() => (editingSelf = false)}>
							<XIcon />
						</Button>
						<Button variant="secondary" size="icon" aria-label="Save name" onclick={saveSelf}>
							<CheckIcon />
						</Button>
					</div>
				{:else}
					<Item.Root variant="outline" size="sm">
						<Item.Media variant="icon">
							<LaptopIcon />
						</Item.Media>
						<Item.Content>
							<Item.Title class="truncate">{pairing.selfName}</Item.Title>
							<Item.Description>The name other devices see for this one.</Item.Description>
						</Item.Content>
						<Item.Actions>
							<Button variant="ghost" size="icon" aria-label="Rename this device" onclick={startEditSelf}>
								<PencilIcon />
							</Button>
						</Item.Actions>
					</Item.Root>
				{/if}
			</section>

			<Separator />

			<!-- Show a code for the other device to type or scan. -->
			<section class="flex flex-col items-center gap-3 text-center">
				<h2 class="self-start text-base font-medium">Add a device</h2>
				{#if code}
					<!-- The QR is the toggle: click reveals or hides it. It encodes the same
					     code shown below, so the other device can scan instead of typing. -->
					<button
						type="button"
						onclick={() => (qrHidden = !qrHidden)}
						aria-label={qrHidden ? 'Show the code' : 'Hide the code'}
						aria-pressed={!qrHidden}
						class="group bg-qr-background relative cursor-pointer overflow-hidden rounded-2xl border p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<QRCode value={code} class={cn('size-44', qrHidden && 'select-none')} />
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
						On your other device, open Add a device and type this code
						{qrHidden ? '(or tap to show the QR and scan it)' : '(or scan this QR)'}. You'll say yes here
						before it's added.
					</p>
					<p class="font-mono text-lg font-medium tracking-wide select-all">{code}</p>
					<div class="flex gap-2">
						<Button variant="secondary" size="sm" onclick={copyCode}>
							{#if copied}
								<CheckIcon data-icon="inline-start" />
								Copied
							{:else}
								<CopyIcon data-icon="inline-start" />
								Copy code
							{/if}
						</Button>
						<Button variant="outline" size="sm" onclick={showCode} disabled={makingCode}>
							<RefreshCwIcon data-icon="inline-start" />
							New code
						</Button>
					</div>
				{:else}
					<Button class="self-start" onclick={showCode} disabled={makingCode}>
						{makingCode ? 'Making a code…' : 'Show a code'}
					</Button>
				{/if}

				<!-- Or go the other way: type the code the other device is showing. -->
				<div class="flex w-full flex-col gap-2 pt-2">
					<Field.Field>
						<Field.FieldLabel for="pair-code">Have a code? Enter it</Field.FieldLabel>
						<div class="flex items-center gap-2">
							<Input
								id="pair-code"
								bind:value={typed}
								placeholder="1234-word-word-word"
								class="font-mono"
								autocomplete="off"
								autocapitalize="none"
								spellcheck="false"
								disabled={connecting}
								onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && connect()}
							/>
							<Button disabled={!typed.trim() || connecting} onclick={connect}>
								{connecting ? 'Linking…' : 'Connect'}
							</Button>
						</div>
						<Field.FieldDescription>
							Type the code your other device is showing, then connect.
						</Field.FieldDescription>
					</Field.Field>
				</div>
			</section>

			<Separator />

			<!-- Your devices: send to them without a code; rename or remove here. -->
			<section class="flex flex-col gap-3">
				<h2 class="text-base font-medium">Your devices</h2>
				{#if pairing.devices.length === 0}
					<Empty.Root class="border border-dashed py-8">
						<Empty.Header>
							<Empty.Media variant="icon">
								<MonitorSmartphoneIcon />
							</Empty.Media>
							<Empty.Title>No devices yet</Empty.Title>
							<Empty.Description>Add one above and you can send to it without a code.</Empty.Description>
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
