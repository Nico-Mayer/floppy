<script lang="ts">
	import * as Kbd from '$lib/components/ui/kbd'
	import { Spinner } from '$lib/components/ui/spinner'
	import * as Tabs from '$lib/components/ui/tabs'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import { IconDownload, IconSend } from '@tabler/icons-svelte'

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

{#snippet trigger(mode: Mode, label: string, Icon: typeof IconSend, shortcut: string)}
	<!-- This bar is the app's primary control, so it gets more weight than
	     shadcn's subtle default — but through neutral means: the active pill
	     borrows the cards' elevation (shadow + ring) and the labels echo the
	     FLOPPY wordmark's heading type. Mode color stays a hint on the icon
	     only. -->
	<Tabs.Trigger
		value={mode}
		class={[
			'relative rounded-lg font-heading font-semibold tracking-wide uppercase max-sm:rounded-xl',
			// not-focus-visible: keeps the card-style ring from shrinking the
			// 3px keyboard focus ring (the active ring compiles later in the css).
			'data-active:shadow-md data-active:not-focus-visible:ring-1 data-active:not-focus-visible:ring-foreground/5 dark:data-active:not-focus-visible:ring-foreground/10',
			mode === 'send'
				? 'data-active:[&_svg]:text-send dark:data-active:[&_svg]:text-send-foreground'
				: 'data-active:[&_svg]:text-receive dark:data-active:[&_svg]:text-receive-foreground'
		]}
	>
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

<!-- Must be rendered inside a Tabs.Root — it provides the tabs context.

     Corners follow the card radius scale instead of shadcn's pill default;
     triggers sit one radius step inside (outer radius minus the list's p-1).
     h-13 keeps the triggers at a comfortable touch size. -->
<Tabs.List class="h-12! w-full gap-1 rounded-xl max-sm:order-last">
	{@render trigger('send', 'Send', IconSend, `${modKey}1`)}
	{@render trigger('receive', 'Receive', IconDownload, `${modKey}2`)}
</Tabs.List>
