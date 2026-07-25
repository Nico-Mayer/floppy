<script lang="ts">
	import { CancelReceive, CancelSend, Receive, Send } from '$bindings/bibor/crocservice'
	import { OpenPath, SelectFiles } from '$bindings/bibor/fileservice'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { Input } from '$lib/components/ui/input'
	import { Progress } from '$lib/components/ui/progress'
	import * as Tabs from '$lib/components/ui/tabs'
	import { Events } from '@wailsio/runtime'
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

	async function copyCode() {
		await navigator.clipboard.writeText(code)
		codeCopied = true
		setTimeout(() => (codeCopied = false), 1500)
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
			<Tabs.Trigger value="send" class="gap-1.5">
				{#if sendBusy}
					<CircleNotchIcon class="animate-spin" />
				{:else}
					<PaperPlaneTiltIcon />
				{/if}
				Send
			</Tabs.Trigger>
			<Tabs.Trigger value="receive" class="gap-1.5">
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
				class="border-destructive/50 text-destructive flex w-full items-center gap-2 rounded-lg border p-2.5 text-sm"
			>
				<WarningCircleIcon class="size-4 shrink-0" />
				<span class="min-w-0 flex-1 truncate" title={error}>{error}</span>
				<Button variant="ghost" size="icon-xs" onclick={() => (error = '')} aria-label="Dismiss">
					<XIcon />
				</Button>
			</div>
		{/if}

		<Tabs.Content value="send" class="min-h-0 flex-1">
			<Card.Root class="h-full">
				<Card.Content class="flex h-full min-h-0 flex-col gap-3">
					{#if sendStatus === 'idle'}
						{#if files.length === 0}
							<button
								type="button"
								onclick={pickFiles}
								class="hover:bg-accent/25 text-muted-foreground flex flex-1 flex-col place-items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center transition-all hover:cursor-pointer"
							>
								<UploadSimpleIcon class="size-8" />
								<span class="text-sm">
									Click to select files<br />or drop them anywhere in the window
								</span>
							</button>
						{:else}
							<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
								{#each files as path (path)}
									<li class="hover:bg-muted/50 group flex items-center gap-2 rounded-lg px-2 py-1.5">
										<FileIcon class="text-muted-foreground size-4 shrink-0" />
										<div class="flex min-w-0 flex-1 flex-col">
											<span class="truncate text-sm">{basename(path)}</span>
											<span class="text-muted-foreground truncate font-mono text-xs">{path}</span>
										</div>
										<Button
											class="opacity-0 transition-opacity group-hover:opacity-100"
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
								<Button class="flex-1" onclick={startSend}>
									<PaperPlaneTiltIcon />
									Send {fileSummary()}
								</Button>
							</div>
						{/if}
					{:else if sendStatus === 'starting'}
						<div class="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3">
							<CircleNotchIcon class="size-8 animate-spin" />
							<p class="text-sm">Preparing…</p>
							<p class="text-muted-foreground text-xs">Large files take a moment to hash</p>
						</div>
					{:else if sendStatus === 'waiting'}
						<div class="flex flex-1 flex-col items-center justify-center gap-4">
							<p class="text-muted-foreground text-sm">Your code phrase</p>
							<button
								type="button"
								onclick={copyCode}
								class="bg-muted hover:bg-muted/70 group flex items-center gap-2 rounded-lg px-4 py-3 font-mono text-base tracking-wide transition-colors hover:cursor-pointer"
								title="Click to copy"
							>
								{code}
								{#if codeCopied}
									<CheckIcon class="size-4 text-emerald-500" />
								{:else}
									<CopyIcon class="text-muted-foreground size-4 opacity-50 group-hover:opacity-100" />
								{/if}
							</button>
							<div class="text-muted-foreground flex items-center gap-2 text-xs">
								<CircleNotchIcon class="shrink-0 animate-spin" />
								Waiting for the receiver to connect…
							</div>
							<p class="text-muted-foreground text-xs">{fileSummary()}</p>
						</div>
						<Button variant="ghost" size="sm" onclick={cancelSend}>
							<XIcon />
							Cancel
						</Button>
					{:else if sendStatus === 'sending'}
						<div class="flex flex-1 flex-col items-center justify-center gap-4">
							<p class="text-2xl font-semibold tabular-nums">{sendProgress}%</p>
							<Progress value={sendProgress} class="h-2 w-2/3" />
							<p class="text-muted-foreground text-xs">Sending {fileSummary()}</p>
						</div>
						<Button variant="ghost" size="sm" onclick={cancelSend}>
							<XIcon />
							Cancel
						</Button>
					{:else if sendStatus === 'done'}
						<div class="flex flex-1 flex-col items-center justify-center gap-3">
							<CheckCircleIcon class="size-10 text-emerald-500" weight="fill" />
							<p class="text-sm">Sent {fileSummary()}</p>
						</div>
						<Button variant="outline" size="sm" onclick={resetSend}>Send more</Button>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="receive" class="min-h-0 flex-1">
			<Card.Root class="h-full">
				<Card.Content class="flex h-full min-h-0 flex-col gap-3">
					{#if receiveStatus === 'done'}
						<div class="flex flex-1 flex-col items-center justify-center gap-3">
							<CheckCircleIcon class="size-10 text-emerald-500" weight="fill" />
							<p class="text-sm">Received</p>
							<p class="text-muted-foreground max-w-full truncate text-xs" title={receivedTo}>
								Saved to {receivedTo}
							</p>
						</div>
						<div class="flex flex-col gap-2">
							<Button size="sm" onclick={() => OpenPath(receivedTo)}>
								<FolderOpenIcon />
								Open folder
							</Button>
							<Button variant="outline" size="sm" onclick={resetReceive}>Receive more</Button>
						</div>
					{:else if receiveStatus === 'receiving'}
						<div class="flex flex-1 flex-col items-center justify-center gap-4">
							{#if receiveProgress !== null}
								<p class="text-2xl font-semibold tabular-nums">{receiveProgress}%</p>
								<Progress value={receiveProgress} class="h-2 w-2/3" />
							{:else}
								<CircleNotchIcon class="text-muted-foreground size-8 animate-spin" />
							{/if}
							<p class="text-muted-foreground text-xs">Receiving into Downloads…</p>
						</div>
						<Button variant="ghost" size="sm" onclick={cancelReceive}>
							<XIcon />
							Cancel
						</Button>
					{:else}
						<div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4">
							<div class="flex flex-col items-center gap-1 text-center">
								<DownloadSimpleIcon class="text-muted-foreground size-8" />
								<p class="text-sm">Receive files</p>
								<p class="text-muted-foreground text-xs">
									Enter the code phrase from the sender — files land in Downloads
								</p>
							</div>
							<div class="flex gap-2">
								<Input
									class="font-mono"
									placeholder="1234-word-word-word"
									bind:value={receiveCode}
									onkeydown={(e) => e.key === 'Enter' && receiveCode.trim() && startReceive()}
								/>
								<Button onclick={startReceive} disabled={!receiveCode.trim()}>
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
