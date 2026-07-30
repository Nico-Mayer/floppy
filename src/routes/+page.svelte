<script lang="ts">
	import AccountSheet from '$lib/components/account/AccountSheet.svelte'
	import IncomingOfferDialog from '$lib/components/IncomingOfferDialog.svelte'
	import ModeSwitcher from '$lib/components/ModeSwitcher.svelte'
	import TitleBar from '$lib/components/TitleBar.svelte'
	import ReceivePanel from '$lib/components/transfer/receive/ReceivePanel.svelte'
	import SendPanel from '$lib/components/transfer/send/SendPanel.svelte'
	import * as Alert from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import { Toaster } from '$lib/components/ui/sonner'
	import * as Tabs from '$lib/components/ui/tabs'
	import { normal, shift } from '$lib/motion'
	import { pairing } from '$lib/pairing-app.svelte'
	import { app, type Mode } from '$lib/transfer-app.svelte'
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { getCurrentWebview } from '@tauri-apps/api/webview'
	import { ModeWatcher } from 'mode-watcher'
	import { onMount } from 'svelte'
	import { fly } from 'svelte/transition'

	// Native file drag-drop. Tauri captures OS drops (HTML5 drag events give no
	// real paths), reporting enter/over/leave/drop with absolute paths. A card
	// opts in with [data-file-drop-target] (see TransferCard); while a drag is
	// over the window we tint every such target, and a drop adds the files —
	// only if a target is mounted (the send panel), so the receive tab rejects.
	function highlightDropTargets(active: boolean) {
		for (const el of document.querySelectorAll('[data-file-drop-target]')) {
			el.classList.toggle('file-drop-target-active', active)
		}
	}

	onMount(() => {
		const stopTransfer = app.listen()
		let stopPairing: (() => void) | undefined
		pairing.init().then((stop) => (stopPairing = stop))

		// Suppress the webview's native right-click menu (Cut/Copy/Paste). A
		// file-transfer app has no use for it, and on macOS it otherwise showed
		// up as a stray step around the file picker.
		const noContextMenu = (e: Event) => e.preventDefault()
		document.addEventListener('contextmenu', noContextMenu)

		let stopDrag: (() => void) | undefined
		getCurrentWebview()
			.onDragDropEvent(async (event) => {
				const p = event.payload
				if (p.type === 'over' || p.type === 'enter') {
					highlightDropTargets(true)
					return
				}
				highlightDropTargets(false)
				if (p.type === 'drop' && document.querySelector('[data-file-drop-target]')) {
					await app.send.addPaths(p.paths)
				}
			})
			.then((un) => (stopDrag = un))

		return () => {
			stopTransfer()
			stopPairing?.()
			stopDrag?.()
			document.removeEventListener('contextmenu', noContextMenu)
		}
	})

	// Dev-only escape hatch: lets the browser preview (no Tauri bridge) drive
	// app state from the console to debug UI in isolation.
	if (import.meta.env.DEV) {
		;(window as unknown as Record<string, unknown>).__app = app
	}
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
				<div class="flex shrink-0 cursor-pointer items-center gap-1">
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
							<CircleAlertIcon />
							<Alert.Title>{app.error.title}</Alert.Title>
							<!-- detail holds the transport's original wording whenever we
							     replaced it with something friendlier; surface it on hover
							     rather than throwing raw text at the user. -->
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
									<XIcon />
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

<!-- Ephemeral pairing notifications (accepted / declined / errors).
     The offset clears the titlebar: sonner's default is 24px from the viewport
     edge, which lands a toast on top of the window frame — over the drag region
     and, on Windows, the min/max/close buttons. Sonner is fixed at a z-index far
     above everything, so nothing else can win that overlap.
     No richColors: it swaps in sonner's own green/red and drops the popover
     tokens the Toaster wires up, so a toast stops matching the dialogs and cards
     around it. Type is carried by the icon instead (see ui/sonner). -->
<Toaster
	position="top-center"
	offset={{ top: 'calc(var(--header-height) + var(--spacing) * 2)' }}
	mobileOffset={{ top: 'calc(var(--header-height) + var(--spacing) * 2)' }}
	closeButton
/>
