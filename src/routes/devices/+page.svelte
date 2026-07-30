<script lang="ts">
	import { isCompleteCode } from '$lib/code'
	import CodeInput from '$lib/components/CodeInput.svelte'
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card/index.js'
	import * as Empty from '$lib/components/ui/empty'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Item from '$lib/components/ui/item'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { Separator } from '$lib/components/ui/separator'
	import { Spinner } from '$lib/components/ui/spinner'
	import { Clipboard, type DeviceInfo } from '$lib/ipc'
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
		if (!isCompleteCode(value) || connecting) return
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

	// --- Remove a paired device (confirm first) ---------------------------------
	let removing = $state<DeviceInfo | null>(null)
	async function confirmRemove() {
		const device = removing
		removing = null
		if (device) await pairing.untrust(device.fingerprint)
	}
</script>

<!-- The cancel/save pair shared by both inline edit fields (this device's name
     and a paired device's name). -->
{#snippet editActions(onsave: () => void, oncancel: () => void)}
	<Button variant="ghost" size="icon" aria-label="Cancel rename" onclick={oncancel}>
		<XIcon />
	</Button>
	<Button variant="secondary" size="icon" aria-label="Save name" onclick={onsave}>
		<CheckIcon />
	</Button>
{/snippet}

<div class="h-full overflow-y-auto">
	<div
		class="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 max-sm:pb-[max(--spacing(4),env(safe-area-inset-bottom))] sm:p-6"
	>
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">Devices</h1>
			<p class="text-sm text-muted-foreground">Add a device to send without a code.</p>
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
						{@render editActions(saveSelf, () => (editingSelf = false))}
					</div>
				{:else}
					<Item.Root variant="outline" size="sm">
						<Item.Media variant="icon">
							<LaptopIcon />
						</Item.Media>
						<Item.Content>
							<Item.Title class="truncate">{pairing.selfName}</Item.Title>
							<Item.Description>The name other devices see.</Item.Description>
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
			<section class="flex flex-col gap-3">
				<!-- Heading, instruction, and the way to replace the code all sit above
				     the card: the card is the secret, everything else is chrome. -->
				<div class="flex items-start justify-between gap-2">
					<div class="flex flex-col gap-1">
						<h2 class="text-base font-medium">Add a device</h2>
						<p class="text-sm text-muted-foreground">Scan or type this code on your other device.</p>
					</div>
					{#if code}
						<Button variant="ghost" size="sm" onclick={showCode} disabled={makingCode}>
							<RefreshCwIcon data-icon="inline-start" class={cn(makingCode && 'animate-spin')} />
							New code
						</Button>
					{/if}
				</div>

				{#if code}
					{@const revealLabel = qrHidden ? 'Show the code' : 'Hide the code'}
					<!-- One toggle hides or reveals the whole card — QR and code text are
					     the same secret, so the veil covers all of it. -->
					<button
						type="button"
						onclick={() => (qrHidden = !qrHidden)}
						aria-label={revealLabel}
						aria-pressed={!qrHidden}
						class="w-full rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Card.Root class="relative w-full cursor-pointer items-center">
							<Card.Content class="bg-qr-background rounded-2xl border p-4">
								<QRCode value={code} class="size-44" />
							</Card.Content>
							<Card.Footer class="font-mono text-lg font-medium tracking-wide">
								{code}
							</Card.Footer>
							<span
								aria-hidden="true"
								class={cn(
									'pointer-events-none absolute inset-0 backdrop-blur-md transition-opacity duration-200',
									!qrHidden && 'opacity-0'
								)}
							></span>
							<!-- Hidden is the resting state, so the eye is always visible there:
							     on touch there is no hover to discover the toggle with. -->
							<span
								class={cn(
									'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150',
									!qrHidden && 'opacity-0 group-hover/card:opacity-100'
								)}
							>
								<span class="rounded-full bg-background/80 p-2.5 text-foreground shadow-sm backdrop-blur">
									{#if qrHidden}
										<EyeIcon class="size-5" />
									{:else}
										<EyeOffIcon class="size-5" />
									{/if}
								</span>
							</span>
						</Card.Root>
					</button>

					<Button variant="secondary" size="lg" class="w-full" onclick={copyCode}>
						{#if copied}
							<CheckIcon data-icon="inline-start" />
							Copied
						{:else}
							<CopyIcon data-icon="inline-start" />
							Copy code
						{/if}
					</Button>
				{:else}
					<Button class="self-start" onclick={showCode} disabled={makingCode}>
						{#if makingCode}
							<Spinner data-icon="inline-start" />
							Making a code…
						{:else}
							Show a code
						{/if}
					</Button>
				{/if}
			</section>

			<Separator />

			<!-- The same pairing from the other side: type the code that device shows. -->
			<section class="flex flex-col gap-3">
				<div class="flex flex-col gap-1">
					<h2 class="text-base font-medium">Enter a code</h2>
					<p class="text-sm text-muted-foreground">Use the code your other device is showing.</p>
				</div>
				<Field.Field>
					<!-- The heading above names this field; the label repeats it for
					     screen readers without doubling it on screen. -->
					<Field.FieldLabel for="pair-code" class="sr-only">Enter a code</Field.FieldLabel>
					<div class="flex items-center gap-2">
						<div class="flex-1">
							<CodeInput id="pair-code" bind:value={typed} disabled={connecting} onsubmit={connect} />
						</div>
						<Button disabled={!isCompleteCode(typed) || connecting} onclick={connect}>
							{#if connecting}
								<Spinner data-icon="inline-start" />
								Linking…
							{:else}
								Connect
							{/if}
						</Button>
					</div>
				</Field.Field>
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
										{@render editActions(saveRename, () => (editing = null))}
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
											onclick={() => (removing = device)}
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
