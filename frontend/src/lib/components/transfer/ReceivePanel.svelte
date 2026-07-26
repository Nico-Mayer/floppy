<script lang="ts">
	import { OpenPath } from '$bindings/floppy/fileservice'
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import { app } from '$lib/transfer-app.svelte'
	import { IconCheck, IconDownload, IconFolderOpen } from '@tabler/icons-svelte'
	import CancelButton from './CancelButton.svelte'
	import Mascot2 from './Mascot2.svelte'
	import TransferCard from './TransferCard.svelte'
	import TransferProgress from './TransferProgress.svelte'

	const receive = app.receive

	let headline = $derived.by(() => {
		switch (receive.status) {
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

<TransferCard accent="receive" title="Receive" {headline} {badge}>
	{#if receive.status === 'done'}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
			<div class="flex size-12 animate-pop items-center justify-center rounded-full border">
				<IconCheck class="size-6 text-receive-foreground" />
			</div>
			<p class="text-base font-bold tracking-tight">Transfer complete</p>
			<p class="max-w-full truncate font-mono text-xs text-muted-foreground" title={receive.savedTo}>
				{receive.savedTo}
			</p>
		</div>
		<div class="flex flex-col gap-2">
			<Button onclick={() => OpenPath(receive.savedTo)}>
				<IconFolderOpen />
				Open folder
			</Button>
			<Button variant="outline" size="sm" onclick={() => receive.reset()}>Receive more</Button>
		</div>
	{:else if receive.status === 'connecting'}
		<TransferProgress accent="receive" label="Looking for the sender…" />
		{#if receive.tooSlow}
			<!-- croc never times out on a bad code, so the only clue the user
                 gets that they mistyped is this one. -->
			<p class="text-center text-xs text-muted-foreground">
				Still nothing. Check that
				<span class="font-mono text-foreground">{receive.code}</span>
				matches the sender's code, and that they are still waiting.
			</p>
		{/if}
		<CancelButton onclick={() => receive.cancel()} />
	{:else if receive.status === 'receiving'}
		<TransferProgress accent="receive" progress={receive.progress} stats={receive.stats} label="Receiving…" />
		<CancelButton onclick={() => receive.cancel()} />
	{:else}
		<div class="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 text-center">
			<!-- <Mascot accent="receive" /> -->

			<Mascot2 class="size-20"></Mascot2>
			<p class="text-lg font-bold tracking-tight">Enter transfer code</p>
			<p class="max-w-64 text-xs text-muted-foreground">Paste the four-word code the sender gave you.</p>
			<div class="mt-1 flex w-full flex-col gap-2">
				<Input
					class="text-center font-mono"
					placeholder="1234-word-word-word"
					bind:value={receive.code}
					maxlength={32}
					onkeydown={(e) => e.key === 'Enter' && receive.code.trim() && receive.start()}
				/>
				<Button onclick={() => receive.start()} disabled={!receive.code.trim()}>
					<IconDownload />
					Receive files
				</Button>
				<p class="font-mono text-xs text-muted-foreground">
					saves to ~/Downloads/{receive.code}
				</p>
			</div>
		</div>
	{/if}
</TransferCard>
