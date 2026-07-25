<script lang="ts">
	import { CancelReceive, CancelSend, Receive, Send } from '$bindings/bibor/crocservice'
	import { OpenPath, SelectFiles } from '$bindings/bibor/fileservice'
	import { BorderBeam } from '$lib/components/magic/border-beam'
	import { ShimmerButton } from '$lib/components/magic/shimmer-button'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { Input } from '$lib/components/ui/input'
	import { Progress } from '$lib/components/ui/progress'
	import * as Tabs from '$lib/components/ui/tabs'
	import { Clipboard, Events } from '@wailsio/runtime'
	import {
		CheckCircleIcon,
		CheckIcon,
		CircleNotchIcon,
		CopyIcon,
		DownloadSimpleIcon,
		FileIcon,
		FolderOpenIcon,
		PaperPlaneTiltIcon,
		PlusIcon,
		UploadSimpleIcon,
		WarningCircleIcon,
		XIcon
	} from 'phosphor-svelte'
	import { onMount } from 'svelte'

	type SendStatus = 'idle' | 'starting' | 'waiting' | 'sending' | 'done'
	type ReceiveStatus = 'idle' | 'receiving' | 'done'

	let tab = $state('send')

	let files: string[] = $state([])
	let sendStatus: SendStatus = $state('idle')
	let code = $state('')
	let codeCopied = $state(false)
	let sendProgress = $state(0)

	let receiveCode = $state('')
	let receiveStatus: ReceiveStatus = $state('idle')
	let receivedTo = $state('')
	let receiveProgress: number | null = $state(null)

	let error = $state('')

	let sendBusy = $derived(!(['idle', 'done'] as SendStatus[]).includes(sendStatus))
	let receiveBusy = $derived((receiveStatus as ReceiveStatus) === 'receiving')

	onMount(() => {
		const unsubs = [
			Events.On('files-dropped', (ev: { data: string[] }) => {
				for (const path of ev.data) addFile(path)
			}),
			Events.On('croc:code', (ev: { data: string }) => {
				code = ev.data
				sendStatus = 'waiting'
			}),
			Events.On('croc:send:progress', (ev: { data: string }) => {
				// Progress only makes sense once the code phrase exists — never
				// let a stray progress line hide the code screen.
				if (sendStatus === 'waiting' || sendStatus === 'sending') {
					sendProgress = Number(ev.data)
					sendStatus = 'sending'
				}
			}),
			Events.On('croc:recv:progress', (ev: { data: string }) => {
				receiveProgress = Number(ev.data)
			}),
			Events.On('croc:sent', () => {
				sendStatus = 'done'
			}),
			Events.On('croc:received', (ev: { data: string }) => {
				receivedTo = ev.data
				receiveStatus = 'done'
			}),
			Events.On('croc:error', (ev: { data: string }) => {
				error = ev.data
				if (sendStatus !== 'done') sendStatus = 'idle'
				if (receiveStatus !== 'done') receiveStatus = 'idle'
			})
		]
		return () => unsubs.forEach((unsub) => unsub())
	})

	function addFile(path: string) {
		if (sendStatus === 'idle' && !files.includes(path)) files.push(path)
	}

	async function pickFiles() {
		const paths = await SelectFiles()
		for (const path of paths ?? []) addFile(path)
	}

	function basename(path: string): string {
		return path.split(/[\\/]/).pop() ?? path
	}

	function fileSummary(): string {
		return files.length === 1 ? basename(files[0]) : `${files.length} files`
	}

	async function startSend() {
		error = ''
		sendProgress = 0
		sendStatus = 'starting'
		try {
			await Send(files)
		} catch (e) {
			error = String(e)
			sendStatus = 'idle'
		}
	}

	async function cancelSend() {
		await CancelSend()
		resetSend()
	}

	function resetSend() {
		files = []
		code = ''
		codeCopied = false
		sendProgress = 0
		sendStatus = 'idle'
	}

	let copyResetTimer: ReturnType<typeof setTimeout>

	async function copyCode() {
		try {
			// Native clipboard via the Go side — reliable in every webview,
			// unlike navigator.clipboard (secure-context/permission quirks).
			await Clipboard.SetText(code)
		} catch {
			await navigator.clipboard.writeText(code)
		}
		codeCopied = true
		clearTimeout(copyResetTimer)
		copyResetTimer = setTimeout(() => (codeCopied = false), 2000)
	}

	async function startReceive() {
		error = ''
		receiveProgress = null
		receiveStatus = 'receiving'
		try {
			await Receive(receiveCode)
		} catch (e) {
			error = String(e)
			receiveStatus = 'idle'
		}
	}

	async function cancelReceive() {
		await CancelReceive()
		resetReceive()
	}

	function resetReceive() {
		receiveCode = ''
		receivedTo = ''
		receiveProgress = null
		receiveStatus = 'idle'
	}
</script>

<div class="flex h-full flex-col gap-3 p-6" data-file-drop-target>
	<Tabs.Root bind:value={tab} class="flex min-h-0 w-full flex-1 flex-col gap-3">
		<Tabs.List class="w-full">
			<Tabs.Trigger value="send" class="gap-1.5 data-[state=active]:text-send">
				{#if sendBusy}
					<CircleNotchIcon class="animate-spin" />
				{:else}
					<PaperPlaneTiltIcon />
				{/if}
				Send
			</Tabs.Trigger>
			<Tabs.Trigger value="receive" class="gap-1.5 data-[state=active]:text-receive">
				{#if receiveBusy}
					<CircleNotchIcon class="animate-spin" />
				{:else}
					<DownloadSimpleIcon />
				{/if}
				Receive
			</Tabs.Trigger>
		</Tabs.List>

		{#if error}
			<div
				class="flex w-full items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 p-2.5 text-sm text-destructive"
			>
				<WarningCircleIcon class="size-4 shrink-0" />
				<span class="min-w-0 flex-1 truncate" title={error}>{error}</span>
				<Button variant="ghost" size="icon-xs" onclick={() => (error = '')} aria-label="Dismiss">
					<XIcon />
				</Button>
			</div>
		{/if}

		<Tabs.Content value="send" class="min-h-0 flex-1">
			<Card.Root class="relative h-full overflow-hidden">
				{#if sendBusy}
					<BorderBeam size={80} duration={5} colorFrom="var(--color-send)" colorTo="var(--color-send)" />
				{/if}
				<Card.Content class="relative flex h-full min-h-0 flex-col gap-3">
					{#if sendStatus === 'idle'}
						{#if files.length === 0}
							<button
								type="button"
								onclick={pickFiles}
								class="flex flex-1 flex-col place-items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-send/25 p-6 text-center text-muted-foreground transition-all hover:cursor-pointer hover:border-send/50 hover:bg-send/5"
							>
								<UploadSimpleIcon class="size-8 text-send" />
								<span class="text-sm">Choose files or drop them here</span>
							</button>
						{:else}
							<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
								{#each files as path (path)}
									<li class="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/50">
										<FileIcon class="size-4 shrink-0 text-send" />
										<div class="flex min-w-0 flex-1 flex-col">
											<span class="truncate text-sm">{basename(path)}</span>
											<span class="truncate font-mono text-xs text-muted-foreground">{path}</span>
										</div>
										<Button
											class="opacity-40 transition-opacity group-hover:opacity-100"
											variant="ghost"
											size="icon-xs"
											onclick={() => (files = files.filter((f) => f !== path))}
											aria-label="Remove"
										>
											<XIcon />
										</Button>
									</li>
								{/each}
							</ul>
							<div class="flex gap-2">
								<Button variant="outline" onclick={pickFiles}>
									<PlusIcon />
									Add
								</Button>
								<ShimmerButton
									class="h-9 flex-1 gap-2 px-4 py-2 text-sm font-medium text-white"
									borderRadius="var(--radius-4xl)"
									background="var(--color-send)"
									shimmerColor="#ffffff"
									onclick={startSend}
								>
									<PaperPlaneTiltIcon />
									Send {fileSummary()}
								</ShimmerButton>
							</div>
						{/if}
					{:else if sendStatus === 'starting'}
						<div class="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
							<CircleNotchIcon class="size-8 animate-spin text-send" />
							<p class="text-sm">Preparing…</p>
						</div>
					{:else if sendStatus === 'waiting'}
						<div class="flex flex-1 flex-col items-center justify-center gap-4">
							<button
								type="button"
								onclick={copyCode}
								class="group flex items-center gap-3 rounded-2xl border border-send/30 bg-send/10 px-5 py-3 font-mono text-lg tracking-wide transition-colors hover:cursor-pointer hover:bg-send/20"
								title="Click to copy"
							>
								{code}
								{#if codeCopied}
									<CheckIcon class="size-5 text-send" />
								{:else}
									<CopyIcon class="size-5 text-muted-foreground group-hover:text-foreground" />
								{/if}
							</button>
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<CircleNotchIcon class="shrink-0 animate-spin text-send" />
								Waiting for receiver…
							</div>
						</div>
						<Button variant="outline" size="sm" onclick={cancelSend}>
							<XIcon />
							Cancel
						</Button>
					{:else if sendStatus === 'sending'}
						<div class="flex flex-1 flex-col items-center justify-center gap-4">
							<p class="text-3xl font-semibold tabular-nums">{sendProgress}%</p>
							<Progress value={sendProgress} class="h-2 w-2/3 [&>[data-slot=progress-indicator]]:bg-send" />
							<p class="text-xs text-muted-foreground">Sending {fileSummary()}</p>
						</div>
						<Button variant="outline" size="sm" onclick={cancelSend}>
							<XIcon />
							Cancel
						</Button>
					{:else if sendStatus === 'done'}
						<div class="flex flex-1 flex-col items-center justify-center gap-3">
							<CheckCircleIcon class="size-10 text-send" weight="fill" />
							<p class="text-sm">Sent {fileSummary()}</p>
						</div>
						<Button variant="outline" size="sm" onclick={resetSend}>Send more</Button>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="receive" class="min-h-0 flex-1">
			<Card.Root class="relative h-full overflow-hidden">
				{#if receiveBusy}
					<BorderBeam
						size={80}
						duration={5}
						colorFrom="var(--color-receive)"
						colorTo="var(--color-receive)"
					/>
				{/if}
				<Card.Content class="relative flex h-full min-h-0 flex-col gap-3">
					{#if receiveStatus === 'done'}
						<div class="flex flex-1 flex-col items-center justify-center gap-3">
							<CheckCircleIcon class="size-10 text-receive" weight="fill" />
							<p class="text-sm">Received</p>
							<p class="max-w-full truncate text-xs text-muted-foreground" title={receivedTo}>
								Saved to {receivedTo}
							</p>
						</div>
						<div class="flex flex-col gap-2">
							<Button
								size="sm"
								class="bg-receive text-white hover:bg-receive/90"
								onclick={() => OpenPath(receivedTo)}
							>
								<FolderOpenIcon />
								Open folder
							</Button>
							<Button variant="outline" size="sm" onclick={resetReceive}>Receive more</Button>
						</div>
					{:else if receiveStatus === 'receiving'}
						<div class="flex flex-1 flex-col items-center justify-center gap-4">
							{#if receiveProgress !== null}
								<p class="text-3xl font-semibold tabular-nums">{receiveProgress}%</p>
								<Progress
									value={receiveProgress}
									class="h-2 w-2/3 [&>[data-slot=progress-indicator]]:bg-receive"
								/>
							{:else}
								<CircleNotchIcon class="size-8 animate-spin text-receive" />
							{/if}
							<p class="text-xs text-muted-foreground">Receiving…</p>
						</div>
						<Button variant="outline" size="sm" onclick={cancelReceive}>
							<XIcon />
							Cancel
						</Button>
					{:else}
						<div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4">
							<div class="flex flex-col items-center gap-1 text-center">
								<DownloadSimpleIcon class="size-8 text-receive" />
								<p class="text-xs text-muted-foreground">Enter the sender's code</p>
							</div>
							<div class="flex gap-2">
								<Input
									class="font-mono"
									placeholder="1234-word-word-word"
									bind:value={receiveCode}
									onkeydown={(e) => e.key === 'Enter' && receiveCode.trim() && startReceive()}
								/>
								<Button
									class="bg-receive text-white hover:bg-receive/90"
									onclick={startReceive}
									disabled={!receiveCode.trim()}
								>
									<DownloadSimpleIcon />
									Receive
								</Button>
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
