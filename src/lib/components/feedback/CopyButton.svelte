<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as InputGroup from '$lib/components/ui/input-group'
	import { haptics } from '$lib/haptics'
	import { Clipboard } from '$lib/ipc'
	import { fast } from '$lib/motion'
	import CheckIcon from '@lucide/svelte/icons/check'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import { toast } from 'svelte-sonner'
	import { scale } from 'svelte/transition'

	// The one copy-with-confirmation control (`feedback`): copies `text`, confirms
	// in place with a check for a couple of seconds, and buzzes on a phone. Two
	// shapes: `label` is a full button, `icon` is the small control inside an
	// input group's trailing addon (it must render inside InputGroup.Root).
	let {
		text,
		variant = 'label',
		disabled = false
	}: {
		text: string
		variant?: 'label' | 'icon'
		disabled?: boolean
	} = $props()

	let copied = $state(false)
	let resetTimer: ReturnType<typeof setTimeout>

	async function copy() {
		try {
			// Native clipboard via the core — reliable in every webview, unlike
			// navigator.clipboard (secure-context/permission quirks).
			await Clipboard.SetText(text)
		} catch {
			try {
				await navigator.clipboard.writeText(text)
			} catch {
				toast.error("Couldn't copy that.")
				return
			}
		}
		copied = true
		void haptics.copied()
		clearTimeout(resetTimer)
		resetTimer = setTimeout(() => (copied = false), 2000)
	}
</script>

{#if variant === 'icon'}
	<InputGroup.Button size="icon-xs" {disabled} onclick={copy} aria-label="Copy code">
		{#if copied}
			<span in:scale={{ start: 0.6, duration: fast() }}>
				<CheckIcon class="text-(--tint-fg)" />
			</span>
		{:else}
			<span in:scale={{ start: 0.6, duration: fast() }}>
				<CopyIcon />
			</span>
		{/if}
	</InputGroup.Button>
{:else}
	<Button variant="secondary" class="flex-1" {disabled} onclick={copy}>
		{#if copied}
			<CheckIcon data-icon="inline-start" />
			Copied
		{:else}
			<CopyIcon data-icon="inline-start" />
			Copy code
		{/if}
	</Button>
{/if}
