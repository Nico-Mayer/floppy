<script lang="ts">
	import { SelectFiles } from '$bindings/bibor/fileservice'
	import { Button } from '$lib/components/ui/button'
	import { Events } from '@wailsio/runtime'
	import { onMount } from 'svelte'

	type OutgoingStatus = 'ready' | 'sending' | 'sent'
	type OutgoingFile = { path: string; status: OutgoingStatus }
	type IncomingFile = { name: string; from: string }

	let outgoing: OutgoingFile[] = $state([])
	let incoming: IncomingFile[] = $state([])

	let sendable = $derived(outgoing.some((f) => f.status === 'ready'))

	onMount(() => {
		const unregister = Events.On('files-dropped', (ev: { data: string[] }) => {
			for (const path of ev.data) addFile(path)
		})
		return () => unregister()
	})

	function addFile(path: string) {
		if (!outgoing.some((f) => f.path === path)) {
			outgoing.push({ path, status: 'ready' })
		}
	}

	async function pickFiles() {
		const paths = await SelectFiles()
		for (const path of paths ?? []) addFile(path)
	}

	function basename(path: string): string {
		return path.split(/[\\/]/).pop() ?? path
	}

	function removeFile(path: string) {
		outgoing = outgoing.filter((f) => f.path !== path)
	}

	// Prototype: there is no real transfer yet, files just walk through the states.
	function send() {
		for (const file of outgoing) {
			if (file.status !== 'ready') continue
			file.status = 'sending'
			setTimeout(() => (file.status = 'sent'), 800 + Math.random() * 1200)
		}
	}
</script>

<div class="grid h-full grid-cols-2 gap-4 p-6" data-file-drop-target>
	<section class="flex min-h-0 flex-col gap-3 rounded-lg border p-4">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-medium">Send ({outgoing.length})</h2>
			<Button variant="outline" size="sm" onclick={pickFiles}>Add files</Button>
		</div>

		{#if outgoing.length === 0}
			<button
				type="button"
				onclick={pickFiles}
				class="hover:bg-accent/25 flex flex-1 flex-col place-items-center justify-center gap-2 rounded-lg border border-dashed p-6 transition-all hover:cursor-pointer"
			>
				<span class="text-sm">Click to select files — or drop them anywhere in the window</span>
			</button>
		{:else}
			<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
				{#each outgoing as file (file.path)}
					<li class="hover:bg-muted/50 flex items-center justify-between gap-2 rounded px-2 py-1.5">
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm">{basename(file.path)}</span>
							<span class="text-muted-foreground truncate font-mono text-xs">{file.path}</span>
						</div>
						{#if file.status === 'ready'}
							<Button
								variant="ghost"
								size="icon-xs"
								onclick={() => removeFile(file.path)}
								aria-label="Remove"
							>
								×
							</Button>
						{:else}
							<span class="text-muted-foreground text-xs">
								{file.status === 'sending' ? 'Sending…' : 'Sent'}
							</span>
						{/if}
					</li>
				{/each}
			</ul>
			<Button onclick={send} disabled={!sendable}>Send</Button>
		{/if}
	</section>

	<section class="flex min-h-0 flex-col gap-3 rounded-lg border p-4">
		<h2 class="text-sm font-medium">Receive ({incoming.length})</h2>

		{#if incoming.length === 0}
			<div
				class="text-muted-foreground flex flex-1 flex-col place-items-center justify-center gap-1 rounded-lg border border-dashed p-6"
			>
				<span class="text-sm">No incoming files</span>
				<span class="text-xs">Waiting for peers — receiving is not implemented yet</span>
			</div>
		{:else}
			<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
				{#each incoming as file (file.name)}
					<li class="hover:bg-muted/50 flex items-center justify-between gap-2 rounded px-2 py-1.5">
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm">{file.name}</span>
							<span class="text-muted-foreground truncate text-xs">from {file.from}</span>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
