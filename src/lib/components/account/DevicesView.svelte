<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Item from '$lib/components/ui/item'
	import { Separator } from '$lib/components/ui/separator'
	import { pairing } from '$lib/pairing-app.svelte'
	import { cn } from '$lib/utils'
	import CheckIcon from '@lucide/svelte/icons/check'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import EyeIcon from '@lucide/svelte/icons/eye'
	import EyeOffIcon from '@lucide/svelte/icons/eye-off'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import MonitorSmartphoneIcon from '@lucide/svelte/icons/monitor-smartphone'
	import PlusIcon from '@lucide/svelte/icons/plus'
	import Trash2Icon from '@lucide/svelte/icons/trash-2'
	import { Clipboard } from '$lib/ipc'
	import AddDeviceDialog from './AddDeviceDialog.svelte'

	// The QR is always mounted; a veil hides it by default so it isn't exposed
	// to onlookers or a screen-share until the user reveals it on purpose.
	let qrHidden = $state(true)
	let addOpen = $state(false)
	let copied = $state(false)

	let copyResetTimer: ReturnType<typeof setTimeout>

	// Keep the list fresh whenever the panel is shown (and again once pairing
	// comes up, since `available` flips when the identity loads).
	$effect(() => {
		if (pairing.available) pairing.refresh()
	})

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
				<MonitorSmartphoneIcon />
			</Empty.Media>
			<Empty.Title>Pairing unavailable</Empty.Title>
			<Empty.Description>
				Could not reach the rendezvous. Start the broker and reopen Floppy to pair devices.
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else}
	<!-- Plain sections, not Field.FieldSet: nothing here is a form control, and a
	     <fieldset>'s <legend> is laid out by the UA outside the normal flow (it is
	     hoisted into the border box), which makes its spacing engine-dependent.
	     Headings in a flex column keep the rhythm fully in our own CSS. -->
	<div class="flex flex-col gap-6">
		<section class="flex flex-col gap-3">
			<h3 class="text-base font-medium">This device</h3>
			<div class="flex flex-col items-center gap-3">
				<!-- The QR is the toggle: click reveals/hides it. overflow-hidden clips
				     the veil to a clean rounded edge, and an eye icon fades in on hover
				     reflecting the current state. -->
				<button
					type="button"
					onclick={() => (qrHidden = !qrHidden)}
					aria-label={qrHidden ? 'Show pairing code' : 'Hide pairing code'}
					aria-pressed={!qrHidden}
					class="group relative cursor-pointer overflow-hidden rounded-2xl border bg-qr-background p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<QRCode value={pairing.identity} class={cn('size-40', qrHidden && 'select-none')} />
					<!-- The veil blurs, not the QR itself: a `filter` on the svg gets its
					     own composited layer whose bounds are inflated by the blur radius,
					     so it can paint past our overflow-hidden. backdrop-filter is
					     clipped to this span's own box. -->
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
				<Button variant="outline" size="sm" onclick={copyIdentity}>
					{#if copied}
						<CheckIcon data-icon="inline-start" />
						Copied
					{:else}
						<CopyIcon data-icon="inline-start" />
						Copy
					{/if}
				</Button>
			</div>
		</section>

		<Separator />

		<!-- Trusted list: send to, or un-trust. Adding is a modal, not inline. -->
		<section class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-base font-medium">Trusted</h3>
				<Button variant="outline" size="sm" onclick={() => (addOpen = true)}>
					<PlusIcon data-icon="inline-start" />
					Add
				</Button>
			</div>
			{#if pairing.devices.length === 0}
				<Empty.Root class="border border-dashed py-8">
					<Empty.Header>
						<Empty.Media variant="icon">
							<MonitorSmartphoneIcon />
						</Empty.Media>
						<Empty.Title>No trusted devices</Empty.Title>
						<Empty.Description>Add a device to send to it without a code.</Empty.Description>
					</Empty.Header>
					<!-- The way out of the empty state, in the empty state. The Add button
					     in the section heading above is easy to read as decoration of the
					     list rather than as the thing to press when the list is bare. -->
					<Empty.Content>
						<Button variant="outline" size="sm" onclick={() => (addOpen = true)}>
							<PlusIcon data-icon="inline-start" />
							Add a device
						</Button>
					</Empty.Content>
				</Empty.Root>
			{:else}
				<Item.Group>
					{#each pairing.devices as device (device.fingerprint)}
						<Item.Root variant="outline" size="sm">
							<Item.Media variant="icon">
								<LaptopIcon />
							</Item.Media>
							<Item.Content>
								<Item.Title class="truncate">{device.name}</Item.Title>
								<Item.Description class="truncate font-mono text-[10px]">
									{device.fingerprint.slice(0, 16)}
								</Item.Description>
							</Item.Content>
							<Item.Actions>
								<Button
									variant="destructive"
									size="icon"
									aria-label="Remove {device.name}"
									onclick={() => pairing.untrust(device.fingerprint)}
								>
									<Trash2Icon />
								</Button>
							</Item.Actions>
						</Item.Root>
					{/each}
				</Item.Group>
			{/if}
		</section>
	</div>

	<AddDeviceDialog bind:open={addOpen} />
{/if}
