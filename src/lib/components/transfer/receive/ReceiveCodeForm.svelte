<script lang="ts">
	import CodeInput from '$lib/components/CodeInput.svelte'
	import { Button } from '$lib/components/ui/button'
	import { isCompleteCode } from '$lib/code'
	import { app } from '$lib/transfer-app.svelte'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import { Clipboard, onWindowFocus } from '$lib/ipc'

	const receive = app.receive

	// Clipboard auto-fill: a code copied elsewhere lands directly in the empty
	// input, with visible provenance and one-click undo. Read only on discrete
	// focus moments (mount, window focus) — never on a timer. Arbitrary clipboard
	// text is dropped on the floor, not displayed or retained. This form is only
	// mounted on the code screen, so that is exactly how long a dismissal holds.
	let filled: string | null = $state(null)
	let dismissed: string | null = $state(null)
	let justFilled = $state(false)
	let fillFlashTimer: ReturnType<typeof setTimeout>

	async function checkClipboard() {
		if (receive.status !== 'idle') return
		let text: string
		try {
			// Reading the clipboard can reject (no permission, or the browser
			// preview outside the Tauri webview); staying empty is the correct
			// degradation.
			text = (await Clipboard.Text()).trim()
		} catch {
			return
		}
		if (!isCompleteCode(text) || text === dismissed) return
		// Fill only an empty input or an unmodified earlier fill — never overwrite
		// something the user typed, and never start the receive.
		if (receive.code.trim() && receive.code !== filled) return
		if (receive.code === text) return
		receive.code = text
		filled = text
		// Pop the input so the fill is seen, not just found. Class comes off after
		// the keyframe so a later fill can replay it.
		justFilled = true
		clearTimeout(fillFlashTimer)
		fillFlashTimer = setTimeout(() => (justFilled = false), 400)
	}

	function clearInput() {
		// Clearing an auto-filled code also blocks that value while this screen is
		// up, otherwise the next window focus would immediately re-fill it. The
		// value itself is cleared by CodeInput.
		if (filled) dismissed = filled
		filled = null
	}

	// An effect on purpose, and the only dependency is the status read below: the
	// clipboard lives outside Svelte, so there is nothing to derive from.
	$effect(() => {
		if (receive.status === 'idle') void checkClipboard()
	})

	// Re-check when the app comes back to the front. Tauri's window focus signal
	// fires reliably where the DOM 'focus' event does not; the shared guard makes
	// double delivery a harmless no-op.
	$effect(() => onWindowFocus(checkClipboard))
</script>

<svelte:window onfocus={checkClipboard} />

<!-- The code group is the panel's real primary — it lives in the anchored action
     zone (thumb reach), width-capped once the card is wide so it never stretches
     into a ribbon. -->
<div class="flex w-full flex-col gap-2 @sm:mx-auto @sm:max-w-sm">
	<CodeInput
		bind:value={receive.code}
		class="text-center"
		flash={justFilled}
		onsubmit={() => receive.start()}
		onclear={clearInput}
	/>
	<Button class="w-full" onclick={() => receive.start()} disabled={!isCompleteCode(receive.code)}>
		<DownloadIcon />
		Get the files
	</Button>
</div>
