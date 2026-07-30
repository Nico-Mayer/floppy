<script lang="ts">
	import * as Kbd from '$lib/components/ui/kbd'
	import { Spinner } from '$lib/components/ui/spinner'
	import * as Tabs from '$lib/components/ui/tabs'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import SendIcon from '@lucide/svelte/icons/send'

	// macOS shows ⌘, everything else Ctrl. The handler already accepts either
	// modifier — this only picks the label. userAgentData.platform is the
	// modern signal; fall back to the (deprecated) platform string.
	const platform =
		(navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
		navigator.platform
	const isMac = /mac/i.test(platform)
	// mac stacks glyphs (⌘1); Ctrl needs a separator (Ctrl+1).
	const modKey = isMac ? '⌘' : 'Ctrl+'

	function handleKeys(e: KeyboardEvent) {
		const meta = e.metaKey || e.ctrlKey
		if (!meta) return

		switch (e.key) {
			case '1':
				app.mode = 'send'
				break
			case '2':
				app.mode = 'receive'
				break
		}
	}
</script>

<svelte:window onkeydown={handleKeys} />

{#snippet trigger(mode: Mode, label: string, Icon: typeof SendIcon, shortcut: string)}
	<Tabs.Trigger value={mode}>
		<div class="flex items-center gap-1.5">
			{#if app[mode].busy}
				<Spinner class="size-5" />
			{:else}
				<Icon class="size-5" />
			{/if}
			{label}
		</div>
		<Kbd.Root class="absolute right-1 max-sm:hidden">{shortcut}</Kbd.Root>
	</Tabs.Trigger>
{/snippet}

<Tabs.List class="h-12! w-full shadow max-sm:order-last">
	{@render trigger('send', 'Send', SendIcon, `${modKey}1`)}
	{@render trigger('receive', 'Receive', DownloadIcon, `${modKey}2`)}
</Tabs.List>
