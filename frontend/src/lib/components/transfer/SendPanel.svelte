<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import { app } from '$lib/transfer-app.svelte'
	import { IconCheck, IconCopy, IconLoader2, IconPlus, IconSend } from '@tabler/icons-svelte'
	import { Clipboard } from '@wailsio/runtime'
	import CancelButton from './CancelButton.svelte'
	import FileRow from './FileRow.svelte'
	import { formatBytes } from './format'
	import Mascot3 from './Mascot3.svelte'
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
			<button
				type="button"
				onclick={() => send.pick()}
				ondragover={(e) => {
					e.preventDefault()
					dragOver = true
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={() => (dragOver = false)}
				class="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors duration-500 hover:cursor-pointer {dragOver
					? 'border-send bg-send/5'
					: 'border-input bg-muted/40 hover:border-send/40'}"
			>
				<!-- <Mascot accent="send" /> -->
				<Mascot3 class="size-20"></Mascot3>
				<span class="text-lg font-bold tracking-tight"> Drag files here </span>
				<span class="max-w-72 text-xs text-muted-foreground">
					Drop them anywhere in this pane, or <span class="text-foreground underline underline-offset-2"
						>browse your files</span
					>. Transfers are peer-to-peer — nothing is uploaded to a server.
				</span>
			</button>
		{:else}
			<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
				{#each send.files as file (file.path)}
					<FileRow {file} onremove={() => send.removeFile(file.path)} />
				{/each}
			</ul>
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
		<TransferProgress accent="send" label="Cancelling…" />
	{:else if send.status === 'starting'}
		<TransferProgress accent="send" label="Connecting to peer…" />
	{:else if send.status === 'waiting'}
		<div class="flex flex-1 flex-col items-center justify-center gap-7">
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
                     solid blobs. -->
				<div class="shrink-0 rounded-2xl border bg-qr-background p-4 sm:p-3">
					<QRCode
						value={send.code}
						fgColor="var(--qr-foreground)"
						bgColor="var(--qr-background)"
						class="size-44 sm:size-32"
					/>
				</div>
				<div class="flex w-full min-w-0 flex-col items-center gap-2.5 sm:items-start">
					<button
						type="button"
						onclick={copyCode}
						class="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3.5 text-left transition-colors hover:cursor-pointer hover:bg-muted/50"
						title="Click to copy"
					>
						<span class="min-w-0 font-mono text-[15px] font-medium break-all">
							{send.code}
						</span>
						{#if copied}
							<IconCheck class="size-4 shrink-0 text-send-foreground" />
						{:else}
							<IconCopy class="size-4 shrink-0 text-muted-foreground" />
						{/if}
					</button>
					<p class="text-center text-xs text-muted-foreground sm:text-left">Expires when you quit the app.</p>
				</div>
			</div>

			<div
				class="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase"
			>
				<IconLoader2 class="size-3.5 shrink-0 animate-spin" />
				awaiting peer
			</div>
		</div>
		<CancelButton onclick={() => send.cancel()} />
	{:else if send.status === 'sending'}
		<TransferProgress
			accent="send"
			progress={send.progress}
			stats={send.stats}
			label="Encrypted · direct peer · {summary}"
		/>
		<CancelButton onclick={() => send.cancel()} />
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-3">
			<div class="flex size-12 animate-pop items-center justify-center rounded-full border">
				<IconCheck class="size-6 text-send-foreground" />
			</div>
			<p class="text-base font-bold tracking-tight">Sent {summary}</p>
		</div>
		<Button variant="outline" size="sm" onclick={() => send.reset()}>New transfer</Button>
	{/if}
</TransferCard>
