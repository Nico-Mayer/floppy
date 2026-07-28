<script lang="ts">
	import { OpenPath } from '$bindings/floppy/internal/services/fileservice'
	import { Button } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as InputGroup from '$lib/components/ui/input-group'
	import { normal, shift } from '$lib/motion'
	import { app } from '$lib/transfer-app.svelte'
	import { IconCheck, IconDownload, IconFolderOpen, IconX } from '@tabler/icons-svelte'
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
		if (receive.code === text) return
		receive.code = text
		filled = text
		// Pop the input so the fill is seen, not just found. Class comes off
		// after the 0.3s keyframe so a later fill can replay it; app.css
		// collapses the keyframe to a fade under prefers-reduced-motion.
		justFilled = true
		clearTimeout(fillFlashTimer)
		fillFlashTimer = setTimeout(() => (justFilled = false), 400)
	}

	let justFilled = $state(false)
	let fillFlashTimer: ReturnType<typeof setTimeout>

	$effect(() => {
		if (app.mode === 'receive') checkClipboard()
	})

	function clearInput() {
		// Clearing an auto-filled code also blocks that value for the session,
		// otherwise the next window focus would immediately re-fill it.
		if (filled) dismissed = filled
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
	{:else if receive.status === 'receiving'}
		<TransferProgress
			progress={receive.progress}
			stats={receive.stats}
			label={currentFile(receive.stats) || 'Receiving…'}
		/>
	{:else}
		<!-- Compact: mascot shrinks and stacks. Regular (@md, card width):
		     hero row — mascot beside the copy, text left-aligned — so the
		     branding stays without spending the card's height on it. -->
		<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
			<Empty.Root class="p-6 @md:p-8">
				<Empty.Header class="@md:max-w-none @md:gap-6">
					<Empty.Media class="@md:mb-0">
						<Mascot accent="receive" class="size-20 @md:size-24" />
					</Empty.Media>
					<div class="flex min-w-0 flex-col items-center gap-2">
						<Empty.Title>Enter transfer code</Empty.Title>
						<Empty.Description>Paste the code given by the transmitter.</Empty.Description>
					</div>
				</Empty.Header>
			</Empty.Root>
		</div>
	{/if}

	{#snippet actions()}
		{#if receive.status === 'done'}
			<Button class="@max-md:min-h-11" onclick={() => OpenPath(receive.savedTo)}>
				<IconFolderOpen />
				Open folder
			</Button>
			<Button variant="outline" size="sm" class="@max-md:min-h-11" onclick={() => receive.reset()}>
				Receive more
			</Button>
		{:else if receive.status === 'connecting' || receive.status === 'receiving'}
			<Button variant="destructive" size="sm" class="@max-md:min-h-11" onclick={() => receive.cancel()}>
				<IconX />
				Cancel
			</Button>
		{:else if receive.status === 'idle'}
			<!-- The code group is the panel's real primary — it lives in the
			     anchored action zone (thumb reach), width-capped once the card
			     is wide so it never stretches into a ribbon. -->
			<div class="flex w-full flex-col gap-2 @sm:mx-auto @sm:max-w-sm">
				<InputGroup.Root class={[justFilled && 'animate-pop']}>
					<InputGroup.Input
						class="text-center font-mono"
						placeholder="1234-word-word-word"
						bind:value={receive.code}
						maxlength={32}
						onkeydown={(e) => e.key === 'Enter' && receive.code.trim() && receive.start()}
					/>
					{#if receive.code}
						<InputGroup.Addon align="inline-end">
							<InputGroup.Button size="icon-xs" onclick={clearInput} aria-label="Clear code">
								<IconX />
							</InputGroup.Button>
						</InputGroup.Addon>
					{/if}
				</InputGroup.Root>
				<Button
					class="w-full @max-md:min-h-11"
					onclick={() => receive.start()}
					disabled={!receive.code.trim()}
				>
					<IconDownload />
					Receive files
				</Button>
			</div>
		{/if}
	{/snippet}
</TransferCard>
