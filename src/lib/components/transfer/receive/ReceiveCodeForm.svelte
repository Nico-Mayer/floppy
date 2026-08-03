<script lang="ts">
	import CodeInput from '$lib/components/CodeInput.svelte'
	import { Button } from '$lib/components/ui/button'
	import { isCompleteCode } from '$lib/code'
	import { parseScanned } from '$lib/code-link'
	import type { ScanCopy } from '$lib/scan.svelte'
	import { canScan, openSettings, scanner } from '$lib/scan.svelte'
	import { app } from '$lib/transfer-app.svelte'
	import DownloadIcon from '@lucide/svelte/icons/download'
	import ScanQrCodeIcon from '@lucide/svelte/icons/scan-qr-code'
	import { toast } from 'svelte-sonner'

	const receive = app.receive

	/** So asking to type instead can put the cursor where the typing goes. */
	const FIELD = 'receive-code'

	/** What the camera says while it is taking a transfer. */
	const COPY: ScanCopy = {
		aim: {
			headline: 'Point at the code on the other device',
			hint: 'Open Send there and pick the files. The code and its QR come up next.'
		},
		caught: { headline: 'Got it. Starting…', hint: 'Hooking up to the other device.' },
		done: { headline: 'Off we go', hint: 'The files are on their way.' }
	}

	/**
	 * How long the camera holds after a code, waiting to see if it was refused, and
	 * how often it looks. Short: this is only here to catch a refusal that comes back
	 * at once, and it sits under the "got it" beat where a fraction of a second does
	 * not read as a wait at all.
	 */
	const EARLY = 400
	const TICK = 50

	/**
	 * What a code read here means.
	 *
	 * A share QR carries a link and a code from anywhere else is bare, so both are
	 * this transfer; a pairing code read here is a real code on the wrong screen, and
	 * saying which screen beats "that code didn't work". Throwing keeps the camera
	 * live, which is where the fix is.
	 */
	async function grab(content: string) {
		const scanned = parseScanned(content)
		if (!scanned) throw new Error("That's not a Floppy code. Point at the code on the other device.")
		if (scanned.kind === 'pair') {
			throw new Error("That's a code for adding a device. Add it on the Devices screen.")
		}

		receive.code = scanned.code
		// start() owns the whole transfer, so it resolves when the files have landed,
		// which is far too late for a camera to be waiting on. It also records its own
		// failure rather than throwing. So this starts it and watches for a beat: a
		// refusal that lands at once (a busy device, nothing at the other end) belongs
		// on the camera with another aim one press away, and anything slower belongs to
		// the panel, which is where a typed code reports too. The error is taken off the
		// panel with it, so it is never said twice.
		void receive.start()
		for (let waited = 0; waited < EARLY; waited += TICK) {
			await new Promise((settle) => setTimeout(settle, TICK))
			const failure = receive.error
			if (failure) {
				receive.error = null
				throw new Error(failure.message)
			}
		}
	}

	/**
	 * The camera owns the whole attempt, including a code that turns out to be the
	 * wrong one: it says it caught something, then that the transfer is off, or why it
	 * is not and that another code is one aim away. So only the ways it ends without a
	 * transfer are handled here.
	 */
	async function scan() {
		const outcome = await scanner.run({ handle: grab, copy: COPY })
		switch (outcome.kind) {
			case 'type':
				document.getElementById(FIELD)?.focus()
				return
			case 'denied':
				toast.info('The camera is off. Type their code instead, or turn it on in Settings.', {
					action: { label: 'Settings', onClick: () => void openSettings() }
				})
				return
			case 'failed':
				toast.error(outcome.message)
				return
			default:
				// The transfer is running, or the camera was stopped on purpose. Either
				// way the panel behind this is already showing what happens next.
				return
		}
	}
</script>

<!-- The code group is the panel's real primary — it lives in the anchored action
     zone (thumb reach), width-capped once the card is wide so it never stretches
     into a ribbon. -->
<div class="flex w-full flex-col gap-2 @sm:mx-auto @sm:max-w-sm">
	<!-- The camera sits with the field, not somewhere else on the screen: it fills
	     the same thing typing fills, and the sender's code is already a QR on the
	     other screen. Nothing is rendered where there is no camera, so a desktop
	     panel is exactly what it was. -->
	<div class="flex items-center gap-2">
		<div class="min-w-0 flex-1">
			<CodeInput id={FIELD} bind:value={receive.code} class="text-center" onsubmit={() => receive.start()} />
		</div>
		{#if canScan()}
			<Button
				variant="outline"
				size="icon"
				aria-label="Scan their code"
				disabled={scanner.active}
				onclick={scan}
			>
				<ScanQrCodeIcon />
			</Button>
		{/if}
	</div>
	<Button class="w-full" onclick={() => receive.start()} disabled={!isCompleteCode(receive.code)}>
		<DownloadIcon />
		Get the files
	</Button>
</div>
