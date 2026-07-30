<script lang="ts">
	import * as Kbd from '$lib/components/ui/kbd'
	import { Spinner } from '$lib/components/ui/spinner'
	import * as Tabs from '$lib/components/ui/tabs'
	import { modKey } from '$lib/platform'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import SendIcon from '@lucide/svelte/icons/send'

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
