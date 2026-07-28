<script lang="ts">
	import BorderBeam from '$lib/components/magic/border-beam/border-beam.svelte'
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as InputGroup from '$lib/components/ui/input-group'
	import * as Item from '$lib/components/ui/item'
	import * as Select from '$lib/components/ui/select'
	import { Spinner } from '$lib/components/ui/spinner'
	import { fast, motionOK, normal } from '$lib/motion'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import {
		IconCheck,
		IconCopy,
		IconDeviceLaptop,
		IconPlus,
		IconSend,
		IconWorld,
		IconX
	} from '@tabler/icons-svelte'
	import { Clipboard } from '@wailsio/runtime'
	import { flip } from 'svelte/animate'
	import { fade, scale } from 'svelte/transition'
	import FileRow from './FileRow.svelte'
	import { currentFile, formatBytes } from './format'
	import Mascot from './Mascot.svelte'
	import TransferCard from './TransferCard.svelte'
	import TransferProgress from './TransferProgress.svelte'

	/** Above this, a transfer is long enough that leaving the app matters. */
	const LARGE_TRANSFER = 2_000_000_000

	const send = app.send

	let summary = $derived(send.files.length === 1 ? send.files[0].name : `${send.files.length} files`)
	let headline = $derived.by(() => {
		switch (send.status) {
			case 'cancelling':
				return 'cancelling'
			case 'starting':
				return 'connecting'
			case 'waiting':
				return 'awaiting peer'
			case 'sending':
				return 'transferring'
			case 'done':
				return 'complete'
			default:
				return send.files.length ? 'review' : 'select files'
		}
	})
	let badge = $derived.by(() => {
		switch (send.status) {
			case 'cancelling':
				return 'stopping'
			case 'starting':
				return '…'
			case 'waiting':
				return 'ready'
			case 'sending':
				return `${send.progress}%`
			case 'done':
				return 'sent'
			default:
				return send.files.length ? formatBytes(send.totalSize) : '0 selected'
		}
	})

	// Send target: 'code' is the classic anyone-with-the-phrase send; any other
	// value is a trusted device's fingerprint. Falls back to 'code' if the
	// chosen device is un-trusted while it is selected.
	let target = $state('code')
	$effect(() => {
		if (target !== 'code' && !pairing.devices.some((d) => d.fingerprint === target)) {
			target = 'code'
		}
	})

	// Label shown in the Select trigger for the current target.
	const targetName = $derived(
		target === 'code'
			? 'Anyone with a code'
			: (pairing.devices.find((d) => d.fingerprint === target)?.name ?? 'Anyone with a code')
	)

	function dispatchSend() {
		if (target === 'code') {
			send.start()
		} else {
			pairing.sendTo(
				target,
				send.files.map((file) => file.path)
			)
		}
	}

	let copied = $state(false)
	let copyResetTimer: ReturnType<typeof setTimeout>

	async function copyCode() {
		try {
			// Native clipboard via the Go side — reliable in every webview,
			// unlike navigator.clipboard (secure-context/permission quirks).
			await Clipboard.SetText(send.code)
		} catch {
			await navigator.clipboard.writeText(send.code)
		}
		copied = true
		clearTimeout(copyResetTimer)
		copyResetTimer = setTimeout(() => (copied = false), 2000)
	}
</script>

<!-- Only this card accepts dropped files, and only while the queue is still
     editable: Wails resolves a drop against the innermost
     [data-file-drop-target] under the cursor and drops it on the floor when
     there is none, so dropping onto the rest of the window (or onto a running
     transfer) is refused with a no-drop cursor instead of silently appending. -->
<TransferCard accent="send" title="Send" {headline} {badge} dropTarget={send.status === 'idle'}>
	{#if send.status === 'idle'}
		{#if send.files.length === 0}
			<Empty.Root
				role="button"
				tabindex={0}
				class="relative cursor-pointer border bg-muted/40 p-6 transition-all duration-200 hover:border-send/40 hover:bg-muted/60 in-[.file-drop-target-active]:scale-[1.01] in-[.file-drop-target-active]:border-send in-[.file-drop-target-active]:bg-send/5 @md:p-8"
				onclick={() => send.pickFiles()}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && send.pickFiles()}
			>
				<!-- Same compact/regular mascot treatment as the receive panel;
				     the whole surface stays the click/drop target. -->
				<Empty.Header class="@md:max-w-none @md:gap-6">
					<Empty.Media class="@md:mb-0">
						<Mascot accent="send" class="size-20 @md:size-24" />
					</Empty.Media>
					<div class="flex min-w-0 flex-col items-center gap-2">
						<Empty.Title>Drag files here</Empty.Title>
						<Empty.Description>
							or <span class="underline underline-offset-2"> browse </span>
						</Empty.Description>
					</div>
				</Empty.Header>
				<Button class="absolute right-4 bottom-4 bg-send" size="icon-lg">
					<IconPlus></IconPlus>
				</Button>
			</Empty.Root>
		{:else}
			<Item.Group class="min-h-0 flex-1 overflow-y-auto">
				{#each send.files as file (file.path)}
					<div animate:flip={{ duration: fast() }}>
						<FileRow {file} onremove={() => send.removeFile(file.path)} />
					</div>
				{/each}
			</Item.Group>
			{#if send.totalSize > LARGE_TRANSFER}
				<p class="text-center text-xs text-muted-foreground">
					Large transfer — both devices need to stay awake with the app open until it finishes.
				</p>
			{/if}
			{#if pairing.devices.length > 0}
				<!-- Trusted devices skip the code: pick one and it gets a prompt to
				     accept. "Anyone with a code" is the classic phrase-based send. -->
				<div class="flex items-center gap-2 px-1">
					<!-- <label for="send-target" class="shrink-0 text-xs text-muted-foreground">Send to</label> -->
					<Select.Root type="single" bind:value={target}>
						<Select.Trigger id="send-target" class="min-w-0 flex-1">
							{#if target === 'code'}
								<IconWorld class="size-4 text-muted-foreground" />
							{:else}
								<IconDeviceLaptop class="size-4 text-muted-foreground" />
							{/if}
							{targetName}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="code" label="Anyone with a code">
								<IconWorld class="size-4 text-muted-foreground" />
								Anyone with a code
							</Select.Item>
							{#if pairing.devices.length > 0}
								<Select.Separator />
								{#each pairing.devices as device (device.fingerprint)}
									<Select.Item value={device.fingerprint} label={device.name}>
										<IconDeviceLaptop class="size-4 text-muted-foreground" />
										{device.name}
									</Select.Item>
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
		{/if}
	{:else if send.status === 'cancelling'}
		<TransferProgress label="Cancelling…" />
	{:else if send.status === 'starting'}
		<TransferProgress label="Connecting to peer…" />
	{:else if send.status === 'waiting'}
		<!-- Entrance-only fades throughout: the outgoing state is removed at
		     once, so no two states ever occupy the card at the same time and
		     the layout cannot jump mid-transition. -->
		<div class="flex flex-1 flex-col items-center justify-center gap-7" in:fade={{ duration: normal() }}>
			<div class="flex flex-col items-center gap-1.5 text-center">
				<p class="animate-pop text-lg font-bold tracking-tight">Ready to share</p>
				<p class="max-w-64 text-xs text-muted-foreground">
					Scan the code with the other device, or pass the phrase along yourself.
				</p>
			</div>

			<!-- Scanning is a phone-held-up gesture, so compact cards lead
                 with a large QR; in a regular-width card it recedes beside
                 the phrase. Container variants, not viewport: the card is
                 the layout unit. -->
			<div class="flex w-full max-w-md flex-col items-center gap-5 @md:max-w-lg @md:flex-row @md:gap-6">
				<!-- The padding is the QR quiet zone; both it and the code
                     share --qr-background so the seam is invisible. bgColor
                     must be opaque — the finder patterns paint their inner
                     ring with it, and a transparent one turns them into
                     solid blobs. The beam travelling the border is the
                     "still waiting for your peer" tell — it stops the moment
                     this screen is replaced. -->
				<div class="relative shrink-0 rounded-2xl border bg-qr-background p-4 @md:p-3">
					<QRCode
						value={send.code}
						fgColor="var(--qr-foreground)"
						bgColor="var(--qr-background)"
						class="size-44 @md:size-32"
					/>
					{#if motionOK()}
						<BorderBeam size={70} duration={5} colorFrom="var(--tint)" colorTo="var(--tint-fg)" />
					{/if}
				</div>
				<div class="flex w-full min-w-0 flex-col items-center gap-2.5 @md:items-start">
					<InputGroup.Root>
						<InputGroup.Input readonly value={send.code} class="font-mono font-medium" />
						<InputGroup.Addon align="inline-end">
							<InputGroup.Button size="icon-xs" onclick={copyCode} aria-label="Copy code">
								{#if copied}
									<span in:scale={{ start: 0.6, duration: fast() }}>
										<IconCheck class="text-(--tint-fg)" />
									</span>
								{:else}
									<span in:scale={{ start: 0.6, duration: fast() }}>
										<IconCopy />
									</span>
								{/if}
							</InputGroup.Button>
						</InputGroup.Addon>
					</InputGroup.Root>
					<p class="text-center text-xs text-muted-foreground @md:text-left">
						Expires when you quit the app.
					</p>
				</div>
			</div>

			<div
				class="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase"
			>
				<Spinner class="size-3.5" />
				awaiting peer
			</div>
		</div>
	{:else if send.status === 'sending'}
		<TransferProgress
			progress={send.progress}
			stats={send.stats}
			label="Encrypted · direct peer · {currentFile(send.stats) || summary}"
		/>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon" class="animate-pop">
						<IconCheck class="text-(--tint-fg)" />
					</Empty.Media>
					<Empty.Title>Sent {summary}</Empty.Title>
				</Empty.Header>
			</Empty.Root>
		</div>
	{/if}

	{#snippet actions()}
		{#if send.status === 'idle' && send.files.length > 0}
			<div class="flex gap-2">
				<Button variant="outline" class="@max-md:min-h-11" onclick={() => send.pickFiles()}>
					<IconPlus />
					Add
				</Button>
				<Button class="flex-1 @max-md:min-h-11" onclick={dispatchSend}>
					<IconSend />
					{target === 'code' ? 'Send' : 'Send to device'}
				</Button>
			</div>
		{:else if send.status === 'waiting' || send.status === 'sending'}
			<Button variant="destructive" size="sm" class="@max-md:min-h-11" onclick={() => send.cancel()}>
				<IconX />
				Cancel
			</Button>
		{:else if send.status === 'done'}
			<Button variant="outline" size="sm" class="@max-md:min-h-11" onclick={() => send.reset()}>
				New transfer
			</Button>
		{/if}
	{/snippet}
</TransferCard>
