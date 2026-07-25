<script lang="ts">
	import { CancelSend, Receive, Send } from '$bindings/bibor/crocservice'
	import { SelectFiles } from '$bindings/bibor/fileservice'
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import { Events } from '@wailsio/runtime'
	import { onMount } from 'svelte'

	type SendStatus = 'idle' | 'starting' | 'waiting' | 'done'
	type ReceiveStatus = 'idle' | 'receiving' | 'done'

	let files: string[] = $state([])
	let sendStatus: SendStatus = $state('idle')
	let code = $state('')
	let codeCopied = $state(false)

	let receiveCode = $state('')
	let receiveStatus: ReceiveStatus = $state('idle')
	let receivedTo = $state('')

	let error = $state('')

	onMount(() => {
		const unsubs = [
			Events.On('files-dropped', (ev: { data: string[] }) => {
				for (const path of ev.data) addFile(path)
			}),
			Events.On('croc:code', (ev: { data: string }) => {
				code = ev.data
				sendStatus = 'waiting'
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

	async function startSend() {
		error = ''
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
		sendStatus = 'idle'
	}

	async function copyCode() {
		await navigator.clipboard.writeText(code)
		codeCopied = true
		setTimeout(() => (codeCopied = false), 1500)
	}

	async function startReceive() {
		error = ''
		receiveStatus = 'receiving'
		try {
			await Receive(receiveCode)
		} catch (e) {
			error = String(e)
			receiveStatus = 'idle'
		}
	}

	function resetReceive() {
		receiveCode = ''
		receivedTo = ''
		receiveStatus = 'idle'
	}
</script>

<div class="flex h-full flex-col gap-4 p-6" data-file-drop-target>
	{#if error}
		<div class="text-destructive rounded-lg border p-3 text-sm">{error}</div>
	{/if}

	<div class="grid min-h-0 flex-1 grid-cols-2 gap-4">
		<section class="flex min-h-0 flex-col gap-3 rounded-lg border p-4">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-medium">Send</h2>
				{#if sendStatus === 'idle'}
					<Button variant="outline" size="sm" onclick={pickFiles}>Add files</Button>
				{/if}
			</div>

			{#if sendStatus === 'idle' && files.length === 0}
				<button
					type="button"
					onclick={pickFiles}
					class="hover:bg-accent/25 flex flex-1 flex-col place-items-center justify-center gap-2 rounded-lg border border-dashed p-6 transition-all hover:cursor-pointer"
				>
					<span class="text-sm">Click to select files — or drop them anywhere in the window</span>
				</button>
			{:else}
				<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
					{#each files as path (path)}
						<li class="hover:bg-muted/50 flex items-center justify-between gap-2 rounded px-2 py-1.5">
							<div class="flex min-w-0 flex-col">
								<span class="truncate text-sm">{basename(path)}</span>
								<span class="text-muted-foreground truncate font-mono text-xs">{path}</span>
							</div>
							{#if sendStatus === 'idle'}
								<Button
									variant="ghost"
									size="icon-xs"
									onclick={() => (files = files.filter((f) => f !== path))}
									aria-label="Remove"
								>
									×
								</Button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if sendStatus === 'idle' && files.length > 0}
				<Button onclick={startSend}>Send</Button>
			{:else if sendStatus === 'starting'}
				<p class="text-muted-foreground text-center text-sm">Starting croc…</p>
			{:else if sendStatus === 'waiting'}
				<div class="flex flex-col gap-2 rounded-lg border p-3">
					<span class="text-muted-foreground text-xs">
						Share this code with the receiver — waiting for them to connect…
					</span>
					<div class="flex items-center gap-2">
						<code class="bg-muted flex-1 rounded px-2 py-1.5 font-mono text-sm">{code}</code>
						<Button variant="outline" size="sm" onclick={copyCode}>
							{codeCopied ? 'Copied' : 'Copy'}
						</Button>
					</div>
					<Button variant="ghost" size="sm" onclick={cancelSend}>Cancel</Button>
				</div>
			{:else if sendStatus === 'done'}
				<div class="flex flex-col gap-2">
					<p class="text-center text-sm">Sent ✓</p>
					<Button variant="outline" size="sm" onclick={resetSend}>Send more</Button>
				</div>
			{/if}
		</section>

		<section class="flex min-h-0 flex-col gap-3 rounded-lg border p-4">
			<h2 class="text-sm font-medium">Receive</h2>

			{#if receiveStatus === 'done'}
				<div class="flex flex-1 flex-col place-items-center justify-center gap-2">
					<p class="text-sm">Received ✓</p>
					<p class="text-muted-foreground text-xs">Saved to {receivedTo}</p>
					<Button variant="outline" size="sm" onclick={resetReceive}>Receive more</Button>
				</div>
			{:else}
				<div class="flex flex-1 flex-col justify-center gap-2">
					<label class="text-muted-foreground text-xs" for="croc-code">
						Enter the sender's code phrase
					</label>
					<div class="flex gap-2">
						<Input
							id="croc-code"
							placeholder="1234-word-word-word"
							bind:value={receiveCode}
							disabled={receiveStatus === 'receiving'}
							onkeydown={(e) => e.key === 'Enter' && receiveCode.trim() && startReceive()}
						/>
						<Button
							onclick={startReceive}
							disabled={receiveStatus === 'receiving' || !receiveCode.trim()}
						>
							{receiveStatus === 'receiving' ? 'Receiving…' : 'Receive'}
						</Button>
					</div>
					<p class="text-muted-foreground text-xs">Files are saved to your Downloads folder.</p>
				</div>
			{/if}
		</section>
	</div>
</div>
