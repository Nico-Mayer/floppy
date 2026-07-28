<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as InputGroup from '$lib/components/ui/input-group'
	import { app } from '$lib/transfer-app.svelte'
	import { IconDownload, IconX } from '@tabler/icons-svelte'
	import { Clipboard } from '@wailsio/runtime'

	const receive = app.receive

	// Clipboard auto-fill: a croc-shaped clipboard code lands directly in the
	// empty code input, with visible provenance and one-click undo. Read only on
	// discrete focus moments (mount, window focus) — never on a timer. Anchored
	// to the default croc shape so arbitrary clipboard text is dropped on the
	// floor, not displayed or retained. This form is only mounted on the code
	// screen, so that is exactly how long a dismissal has to hold.
	const CODE_SHAPE = /^\d+-\w+-\w+-\w+$/

	let filled: string | null = $state(null)
	let dismissed: string | null = $state(null)
	let justFilled = $state(false)
	let fillFlashTimer: ReturnType<typeof setTimeout>

	async function checkClipboard() {
		if (receive.status !== 'idle') return
		let text: string
		try {
			// Native clipboard via the Go side — reliable in every webview, unlike
			// navigator.clipboard. Rejects in the browser preview (no Wails
			// runtime); staying empty is the correct degradation.
			text = (await Clipboard.Text()).trim()
		} catch {
			return
		}
		if (!CODE_SHAPE.test(text) || text === dismissed) return
		// Fill only an empty input or an unmodified earlier fill — never overwrite
		// something the user typed, and never start the receive.
		if (receive.code.trim() && receive.code !== filled) return
		if (receive.code === text) return
		receive.code = text
		filled = text
		// Pop the input so the fill is seen, not just found. Class comes off after
		// the 0.3s keyframe so a later fill can replay it; app.css collapses the
		// keyframe to a fade under prefers-reduced-motion.
		justFilled = true
		clearTimeout(fillFlashTimer)
		fillFlashTimer = setTimeout(() => (justFilled = false), 400)
	}

	function clearInput() {
		// Clearing an auto-filled code also blocks that value while this screen is
		// up, otherwise the next window focus would immediately re-fill it.
		if (filled) dismissed = filled
		filled = null
		receive.code = ''
	}

	// An effect on purpose, and the only dependency is the status read below: the
	// clipboard lives outside Svelte, so there is nothing to derive from. This
	// covers the code screen appearing; <svelte:window> covers every focus after.
	$effect(() => {
		if (receive.status === 'idle') void checkClipboard()
	})
</script>

<svelte:window onfocus={checkClipboard} />

<!-- The code group is the panel's real primary — it lives in the anchored action
     zone (thumb reach), width-capped once the card is wide so it never stretches
     into a ribbon. -->
<div class="flex w-full flex-col gap-2 @sm:mx-auto @sm:max-w-sm">
	<InputGroup.Root class={[justFilled && 'animate-pop']}>
		<InputGroup.Input
			class="text-center font-mono"
			placeholder="1234-word-word-word"
			bind:value={receive.code}
			maxlength={32}
			onkeydown={(e) => e.key === 'Enter' && receive.code.trim() && receive.start()}
		/>
		{#if receive.code}
			<InputGroup.Addon align="inline-end">
				<InputGroup.Button size="icon-xs" onclick={clearInput} aria-label="Clear code">
					<IconX />
				</InputGroup.Button>
			</InputGroup.Addon>
		{/if}
	</InputGroup.Root>
	<Button class="w-full" onclick={() => receive.start()} disabled={!receive.code.trim()}>
		<IconDownload />
		Receive files
	</Button>
</div>
