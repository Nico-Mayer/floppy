<script lang="ts">
	import BorderBeam from '$lib/components/magic/border-beam/border-beam.svelte'
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as InputGroup from '$lib/components/ui/input-group'
	import * as Item from '$lib/components/ui/item'
	import { Spinner } from '$lib/components/ui/spinner'
	import { fast, motionOK, normal } from '$lib/motion'
	import { app } from '$lib/transfer-app.svelte'
	import { IconCheck, IconCopy, IconPlus, IconSend, IconX } from '@tabler/icons-svelte'
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

	let dragOver = $state(false)
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

<TransferCard accent="send" title="Send" {headline} {badge}>
	{#if send.status === 'idle'}
		{#if send.files.length === 0}
			<Empty.Root
				role="button"
				tabindex={0}
				class={[
					'cursor-pointer border transition-all duration-200',
					dragOver
						? 'scale-[1.01] border-send bg-send/5'
						: 'bg-muted/40 hover:border-send/40 hover:bg-muted/60'
				]}
				onclick={() => send.pick()}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && send.pick()}
				ondragover={(e) => {
					e.preventDefault()
					dragOver = true
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={() => (dragOver = false)}
			>
				<Empty.Header>
					<Empty.Media>
						<Mascot accent="send" class="size-20" />
					</Empty.Media>
					<Empty.Title>Drag files here</Empty.Title>
					<Empty.Description>
						Drop them anywhere in this pane, or <span class="underline underline-offset-2">
							browse your files
						</span>. Transfers are peer-to-peer — nothing is uploaded to a server.
					</Empty.Description>
				</Empty.Header>
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
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => send.pick()}>
					<IconPlus />
					Add
				</Button>
				<Button class="flex-1" onclick={() => send.start()}>
					<IconSend />
					Send {summary} · {formatBytes(send.totalSize)}
				</Button>
			</div>
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

			<!-- Scanning is a phone-held-up gesture, so narrow layouts lead
                 with a large QR; on desktop it recedes beside the phrase. -->
			<div class="flex w-full max-w-md flex-col items-center gap-5 sm:max-w-lg sm:flex-row sm:gap-6">
				<!-- The padding is the QR quiet zone; both it and the code
                     share --qr-background so the seam is invisible. bgColor
                     must be opaque — the finder patterns paint their inner
                     ring with it, and a transparent one turns them into
                     solid blobs. The beam travelling the border is the
                     "still waiting for your peer" tell — it stops the moment
                     this screen is replaced. -->
				<div class="relative shrink-0 rounded-2xl border bg-qr-background p-4 sm:p-3">
					<QRCode
						value={send.code}
						fgColor="var(--qr-foreground)"
						bgColor="var(--qr-background)"
						class="size-44 sm:size-32"
					/>
					{#if motionOK()}
						<BorderBeam size={70} duration={5} colorFrom="var(--tint)" colorTo="var(--tint-fg)" />
					{/if}
				</div>
				<div class="flex w-full min-w-0 flex-col items-center gap-2.5 sm:items-start">
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
					<p class="text-center text-xs text-muted-foreground sm:text-left">Expires when you quit the app.</p>
				</div>
			</div>

			<div
				class="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase"
			>
				<Spinner class="size-3.5" />
				awaiting peer
			</div>
		</div>
		<Button variant="destructive" size="sm" onclick={() => send.cancel()}>
			<IconX />
			Cancel
		</Button>
	{:else if send.status === 'sending'}
		<TransferProgress
			progress={send.progress}
			stats={send.stats}
			label="Encrypted · direct peer · {currentFile(send.stats) || summary}"
		/>
		<Button variant="destructive" size="sm" onclick={() => send.cancel()}>
			<IconX />
			Cancel
		</Button>
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
		<Button variant="outline" size="sm" onclick={() => send.reset()}>New transfer</Button>
	{/if}
</TransferCard>
