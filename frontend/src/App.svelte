<script lang="ts">
	import AccountSheet from '$lib/components/AccountSheet.svelte'
	import IncomingOfferDialog from '$lib/components/IncomingOfferDialog.svelte'
	import ModeSwitcher from '$lib/components/ModeSwitcher.svelte'
	import TitleBar from '$lib/components/TitleBar.svelte'
	import ReceivePanel from '$lib/components/transfer/ReceivePanel.svelte'
	import SendPanel from '$lib/components/transfer/SendPanel.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import * as Tabs from '$lib/components/ui/tabs'
	import { normal, shift } from '$lib/motion'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import { IconAlertCircle, IconX } from '@tabler/icons-svelte'
	import { ModeWatcher } from 'mode-watcher'
	import { onMount } from 'svelte'
	import { fly } from 'svelte/transition'
	import './app.css'

	onMount(() => {
		const stopTransfer = app.listen()
		let stopPairing: (() => void) | undefined
		pairing.init().then((stop) => (stopPairing = stop))
		return () => {
			stopTransfer()
			stopPairing?.()
		}
	})

	// Dev-only escape hatch: lets the browser preview (no Wails bindings)
	// drive app state from the console to debug UI in isolation.
	if (import.meta.env.DEV) {
		;(window as unknown as Record<string, unknown>).__app = app
	}

	// Pairing status toasts (accepted / declined / error) clear themselves — a
	// pending decision lives in the dialog, not here.
	$effect(() => {
		if (!pairing.toast) return
		const timer = setTimeout(() => pairing.dismissToast(), 4000)
		return () => clearTimeout(timer)
	})
</script>

<ModeWatcher />

<div class="flex h-svh flex-col [--header-height:calc(--spacing(13))]">
	<TitleBar />

	<main
		class="flex min-h-0 flex-1 flex-col gap-3 p-4 max-sm:pb-[max(--spacing(4),env(safe-area-inset-bottom))] sm:p-6"
	>
		<!-- One width ceiling for the whole pane, so the header and the tabs
             can never drift apart. -->
		<div
			class="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 sm:max-w-3xl md:max-w-4xl lg:max-w-7xl"
		>
			<div class="flex items-center gap-2.5 px-1">
				<h1 class="font-heading text-xl font-black tracking-tight uppercase">Floppy</h1>
				<p
					class="min-w-0 flex-1 truncate font-mono text-[9px] tracking-wider text-muted-foreground uppercase"
				>
					no cloud · peer to peer
				</p>
				<div class="flex shrink-0 items-center gap-1">
					<AccountSheet />
				</div>
			</div>

			<Tabs.Root
				value={app.mode}
				onValueChange={(value) => (app.mode = value as Mode)}
				class="flex min-h-0 flex-1 flex-col gap-3"
			>
				<ModeSwitcher />

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

<!-- Trusted-device incoming transfer prompt — opens whenever an offer arrives. -->
<IncomingOfferDialog />

{#if pairing.toast}
	<div
		class="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
		transition:fly={{ y: shift(), duration: normal() }}
	>
		<div
			class={[
				'flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur',
				pairing.toast.kind === 'error'
					? 'border-destructive/30 bg-destructive/10 text-destructive'
					: 'bg-background/90'
			]}
			role="status"
		>
			<span>{pairing.toast.message}</span>
			<Button variant="ghost" size="icon-xs" onclick={() => pairing.dismissToast()} aria-label="Dismiss">
				<IconX />
			</Button>
		</div>
	</div>
{/if}
