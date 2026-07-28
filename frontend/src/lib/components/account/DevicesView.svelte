<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Field from '$lib/components/ui/field'
	import { pairing } from '$lib/pairing-app.svelte'
	import {
		IconCheck,
		IconCopy,
		IconDeviceLaptop,
		IconDevices,
		IconEye,
		IconEyeOff,
		IconPlus,
		IconTrash
	} from '@tabler/icons-svelte'
	import { Clipboard } from '@wailsio/runtime'
	import { cn } from '$lib/utils'
	import AddDeviceDialog from './AddDeviceDialog.svelte'

	// The QR is always mounted; a blur veils it by default so it isn't exposed
	// to onlookers or a screen-share until the user reveals it on purpose.
	let qrHidden = $state(true)
	let addOpen = $state(false)

	// Keep the list fresh whenever the panel is shown (and again once pairing
	// comes up, since `available` flips when the identity loads).
	$effect(() => {
		if (pairing.available) pairing.refresh()
	})

	let copied = $state(false)
	let copyResetTimer: ReturnType<typeof setTimeout>

	async function copyIdentity() {
		try {
			// Native clipboard via the Go side — reliable in every webview, unlike
			// navigator.clipboard (secure-context/permission quirks). Same as SendPanel.
			await Clipboard.SetText(pairing.identity)
		} catch {
			await navigator.clipboard.writeText(pairing.identity)
		}
		copied = true
		clearTimeout(copyResetTimer)
		copyResetTimer = setTimeout(() => (copied = false), 2000)
	}
</script>

{#if !pairing.available}
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon">
				<IconDevices />
			</Empty.Media>
			<Empty.Title>Pairing unavailable</Empty.Title>
			<Empty.Description>
				Could not reach the rendezvous. Start the broker and reopen Floppy to pair devices.
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else}
	<Field.FieldGroup>
		<!-- This device's identity: QR + copyable blob for the peer to add. -->
		<Field.FieldSet>
			<Field.FieldLegend>This device</Field.FieldLegend>
			<div class="flex flex-col items-center gap-3">
				<!-- overflow-hidden clips the blur so it fades to a clean rounded edge
				     instead of a white halo bleeding past the SVG box. -->
				<div class="overflow-hidden rounded-2xl border bg-qr-background p-4">
					<QRCode
						value={pairing.identity}
						fgColor="var(--qr-foreground)"
						bgColor="var(--qr-background)"
						class={cn('size-40 transition duration-200', qrHidden && 'blur-md select-none')}
					/>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={() => (qrHidden = !qrHidden)}>
						{#if qrHidden}
							<IconEye data-icon="inline-start" />
							Show pairing code
						{:else}
							<IconEyeOff data-icon="inline-start" />
							Hide pairing code
						{/if}
					</Button>
					<Button variant="outline" size="sm" onclick={copyIdentity}>
						{#if copied}
							<IconCheck data-icon="inline-start" />
							Copied
						{:else}
							<IconCopy data-icon="inline-start" />
							Copy
						{/if}
					</Button>
				</div>
			</div>
		</Field.FieldSet>

		<Field.FieldSeparator />

		<!-- Trusted list: send to, or un-trust. Adding is a modal, not inline. -->
		<div>
			<div class="mb-3 flex items-center justify-between gap-2">
				<span class="font-medium">Trusted</span>
				<Button variant="outline" size="sm" onclick={() => (addOpen = true)}>
					<IconPlus data-icon="inline-start" />
					Add
				</Button>
			</div>
			{#if pairing.devices.length === 0}
				<p class="px-1 py-2 text-sm text-muted-foreground">No trusted devices yet.</p>
			{:else}
				<div class="flex flex-col gap-1">
					{#each pairing.devices as device (device.fingerprint)}
						<div class="flex items-center gap-2 rounded-xl border px-3 py-2">
							<IconDeviceLaptop class="size-5 shrink-0 text-muted-foreground" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{device.name}</p>
								<p class="truncate font-mono text-[10px] text-muted-foreground">
									{device.fingerprint.slice(0, 16)}
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Remove"
								onclick={() => pairing.untrust(device.fingerprint)}
							>
								<IconTrash />
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Field.FieldGroup>

	<AddDeviceDialog bind:open={addOpen} />
{/if}
