<script lang="ts">
	import { OpenPath } from '$bindings/floppy/internal/services/fileservice'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import { Input } from '$lib/components/ui/input'
	import { normal, shift } from '$lib/motion'
	import { app } from '$lib/transfer-app.svelte'
	import { IconCheck, IconClipboard, IconDownload, IconFolderOpen, IconX } from '@tabler/icons-svelte'
	import { Clipboard } from '@wailsio/runtime'
	import { fade, fly } from 'svelte/transition'
	import { currentFile } from './format'
	import Mascot from './Mascot.svelte'
	import TransferCard from './TransferCard.svelte'
	import TransferProgress from './TransferProgress.svelte'

	const receive = app.receive

	// Clipboard auto-fill: a croc-shaped clipboard code lands directly in the
	// empty code input, with visible provenance and one-click undo. Read only
	// on discrete focus moments (tab switch, window focus) — never on a timer.
	// Anchored to the default croc shape so arbitrary clipboard text is
	// dropped on the floor, not displayed or retained.
	const CODE_SHAPE = /^\d+-\w+-\w+-\w+$/

	let filled: string | null = $state(null)
	let dismissed: string | null = $state(null)

	async function checkClipboard() {
		if (app.mode !== 'receive' || receive.status !== 'idle') return
		let text: string
		try {
			// Native clipboard via the Go side — reliable in every webview,
			// unlike navigator.clipboard. Rejects in the browser preview
			// (no Wails runtime); staying empty is the correct degradation.
			text = (await Clipboard.Text()).trim()
		} catch {
			return
		}
		if (!CODE_SHAPE.test(text) || text === dismissed) return
		// Fill only an empty input or an unmodified earlier fill — never
		// overwrite something the user typed, and never start the receive.
		if (receive.code.trim() && receive.code !== filled) return
		receive.code = text
		filled = text
	}

	$effect(() => {
		if (app.mode === 'receive') checkClipboard()
	})

	let fromClipboard = $derived(filled !== null && receive.code === filled)

	function clearFill() {
		dismissed = filled
		filled = null
		receive.code = ''
	}

	let headline = $derived.by(() => {
		switch (receive.status) {
			case 'cancelling':
				return 'cancelling'
			case 'connecting':
				return 'connecting'
			case 'receiving':
				return 'receiving'
			case 'done':
				return 'complete'
			default:
				return 'enter code'
		}
	})
	let badge = $derived.by(() => {
		switch (receive.status) {
			case 'cancelling':
				return 'stopping'
			case 'connecting':
				return '…'
			case 'receiving':
				return receive.progress === null ? '…' : `${receive.progress}%`
			case 'done':
				return 'complete'
			default:
				return 'idle'
		}
	})
</script>

<svelte:window onfocus={checkClipboard} />

<TransferCard accent="receive" title="Receive" {headline} {badge}>
	{#if receive.status === 'done'}
		<!-- Entrance-only fades: the outgoing state is removed at once, so no
		     two states share the card and the layout cannot jump. -->
		<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon" class="animate-pop">
						<IconCheck class="text-(--tint-fg)" />
					</Empty.Media>
					<Empty.Title>Transfer complete</Empty.Title>
					<Empty.Description class="w-full truncate font-mono text-xs" title={receive.savedTo}>
						{receive.savedTo}
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		</div>
		<div class="flex flex-col gap-2">
			<Button onclick={() => OpenPath(receive.savedTo)}>
				<IconFolderOpen />
				Open folder
			</Button>
			<Button variant="outline" size="sm" onclick={() => receive.reset()}>Receive more</Button>
		</div>
	{:else if receive.status === 'cancelling'}
		<TransferProgress label="Cancelling…" />
	{:else if receive.status === 'connecting'}
		<TransferProgress label="Looking for the sender…" />
		{#if receive.tooSlow}
			<!-- croc never times out on a bad code, so the only clue the user
                 gets that they mistyped is this one. It arrives on a delay, so
                 it slides in rather than blinking into place. -->
			<p
				class="text-center text-xs text-muted-foreground"
				transition:fly={{ y: shift(), duration: normal() }}
			>
				Still nothing. Check that
				<span class="font-mono text-foreground">{receive.code}</span>
				matches the sender's code, and that they are still waiting.
			</p>
		{/if}
		<Button variant="destructive" size="sm" onclick={() => receive.cancel()}>
			<IconX />
			Cancel
		</Button>
	{:else if receive.status === 'receiving'}
		<TransferProgress
			progress={receive.progress}
			stats={receive.stats}
			label={currentFile(receive.stats) || 'Receiving…'}
		/>
		<Button variant="destructive" size="sm" onclick={() => receive.cancel()}>
			<IconX />
			Cancel
		</Button>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
			<Empty.Root>
				<Empty.Header>
					<Empty.Media>
						<Mascot accent="receive" class="size-20" />
					</Empty.Media>
					<Empty.Title>Enter transfer code</Empty.Title>
					<Empty.Description>Paste the four-word code the sender gave you.</Empty.Description>
				</Empty.Header>
				<Empty.Content class="gap-2">
					<Input
						class="text-center font-mono"
						placeholder="1234-word-word-word"
						bind:value={receive.code}
						maxlength={32}
						onkeydown={(e) => e.key === 'Enter' && receive.code.trim() && receive.start()}
					/>
					{#if fromClipboard}
						<div
							class="flex items-center justify-center gap-1 text-xs text-muted-foreground"
							transition:fly={{ y: -shift(), duration: normal() }}
						>
							<IconClipboard class="size-3.5" />
							from clipboard
							<Button variant="ghost" size="icon-xs" onclick={clearFill} aria-label="Clear">
								<IconX />
							</Button>
						</div>
					{/if}
					<Button class="w-full" onclick={() => receive.start()} disabled={!receive.code.trim()}>
						<IconDownload />
						Receive files
					</Button>
					<p class="font-mono text-xs text-muted-foreground">
						saves to ~/Downloads/{receive.code}
					</p>
				</Empty.Content>
			</Empty.Root>
		</div>
	{/if}
</TransferCard>
