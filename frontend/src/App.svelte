<script lang="ts">
	import TitleBar from '$lib/components/TitleBar.svelte'
	import ReceivePanel from '$lib/components/transfer/ReceivePanel.svelte'
	import SendPanel from '$lib/components/transfer/SendPanel.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Kbd from '$lib/components/ui/kbd'
	import { Spinner } from '$lib/components/ui/spinner'
	import * as Tabs from '$lib/components/ui/tabs'
	import { normal, shift } from '$lib/motion'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import { IconAlertCircle, IconDownload, IconSend, IconX } from '@tabler/icons-svelte'
	import { ModeWatcher } from 'mode-watcher'
	import { onMount } from 'svelte'
	import { fly } from 'svelte/transition'
	import './app.css'

	onMount(() => app.listen())

	// Dev-only escape hatch: lets the browser preview (no Wails bindings)
	// drive app state from the console to debug UI in isolation.
	if (import.meta.env.DEV) {
		;(window as unknown as Record<string, unknown>).__app = app
	}

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

<ModeWatcher />

{#snippet trigger(mode: Mode, label: string, Icon: typeof IconSend, shortcut: string)}
	<Tabs.Trigger value={mode} class="relative">
		<div class="flex items-center gap-1.5">
			{#if app[mode].busy}
				<Spinner />
			{:else}
				<Icon />
			{/if}
			{label}
		</div>
		<Kbd.Root class="absolute right-1">{shortcut}</Kbd.Root>
	</Tabs.Trigger>
{/snippet}

<div class="flex h-svh flex-col [--header-height:calc(--spacing(13))]">
	<TitleBar />

	<main class="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
		<!-- One width ceiling for the whole pane, so the header and the tabs
             can never drift apart. -->
		<div
			class="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 sm:max-w-3xl md:max-w-4xl lg:max-w-7xl"
		>
			<div class="flex items-center gap-2.5 px-1">
				<h1 class="font-heading text-xl font-black tracking-tight uppercase">Floppy</h1>
				<p class="truncate font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
					no cloud · direct device to device
				</p>
			</div>

			<Tabs.Root
				value={app.mode}
				onValueChange={(value) => (app.mode = value as Mode)}
				class="flex min-h-0 flex-1 flex-col gap-3"
			>
				<Tabs.List class="w-full">
					{@render trigger('send', 'Send', IconSend, '⌘1')}
					{@render trigger('receive', 'Receive', IconDownload, '⌘2')}
				</Tabs.List>

				{#if app.error}
					<div transition:fly={{ y: -shift(), duration: normal() }}>
						<Alert.Root variant="destructive" class="animate-shake">
							<IconAlertCircle />
							<Alert.Title>{app.error.title}</Alert.Title>
							<!-- detail holds croc's original wording whenever we replaced
							     it with something friendlier; surface it on hover rather
							     than throwing raw text at the user. -->
							<Alert.Description title={app.error.detail}>
								{app.error.message}
							</Alert.Description>
							<Alert.Action>
								<Button
									variant="ghost"
									size="icon-xs"
									onclick={() => (app.error = null)}
									aria-label="Dismiss"
								>
									<IconX />
								</Button>
							</Alert.Action>
						</Alert.Root>
					</div>
				{/if}

				<Tabs.Content value="send" class="min-h-0 flex-1">
					<SendPanel />
				</Tabs.Content>

				<Tabs.Content value="receive" class="min-h-0 flex-1">
					<ReceivePanel />
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</main>
</div>
