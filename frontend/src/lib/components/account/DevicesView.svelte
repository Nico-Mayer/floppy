<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Field from '$lib/components/ui/field'
	import * as Item from '$lib/components/ui/item'
	import { pairing } from '$lib/pairing-app.svelte'
	import { cn } from '$lib/utils'
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
				<!-- The QR is the toggle: click reveals/hides the blur. overflow-hidden
				     clips the blur to a clean rounded edge (no white halo). An eye icon
				     fades in on hover, reflecting the current state. -->
				<button
					type="button"
					onclick={() => (qrHidden = !qrHidden)}
					aria-label={qrHidden ? 'Show pairing code' : 'Hide pairing code'}
					aria-pressed={!qrHidden}
					class="group relative cursor-pointer overflow-hidden rounded-2xl border bg-qr-background p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<QRCode
						value={pairing.identity}
						fgColor="var(--qr-foreground)"
						bgColor="var(--qr-background)"
						class={cn('size-40 transition duration-200', qrHidden && 'blur-md select-none')}
					/>
					<span
						class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100"
					>
						<span class="rounded-full bg-background/80 p-2.5 text-foreground shadow-sm backdrop-blur">
							{#if qrHidden}
								<IconEye class="size-5" />
							{:else}
								<IconEyeOff class="size-5" />
							{/if}
						</span>
					</span>
				</button>
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
		</Field.FieldSet>

		<Field.FieldSeparator />

		<Field.FieldSet>
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
					<Item.Group class="gap-1">
						{#each pairing.devices as device (device.fingerprint)}
							<Item.Root variant="outline" size="sm">
								<Item.Media variant="icon">
									<IconDeviceLaptop class="text-muted-foreground" />
								</Item.Media>
								<Item.Content>
									<Item.Title class="truncate">{device.name}</Item.Title>
									<Item.Description class="truncate font-mono text-[10px]">
										{device.fingerprint.slice(0, 16)}
									</Item.Description>
								</Item.Content>
								<Item.Actions>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Remove"
										onclick={() => pairing.untrust(device.fingerprint)}
									>
										<IconTrash />
									</Button>
								</Item.Actions>
							</Item.Root>
						{/each}
					</Item.Group>
				{/if}
			</div>
		</Field.FieldSet>
	</Field.FieldGroup>

	<AddDeviceDialog bind:open={addOpen} />
{/if}
