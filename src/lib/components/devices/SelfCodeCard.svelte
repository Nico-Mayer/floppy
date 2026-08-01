<script lang="ts">
	import RevealVeil from '$lib/components/RevealVeil.svelte'
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card/index.js'
	import { Spinner } from '$lib/components/ui/spinner'
	import { haptics } from '$lib/haptics'
	import { Clipboard, type PairCode } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import CheckIcon from '@lucide/svelte/icons/check'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
	import { toast } from 'svelte-sonner'

	// This device's half of a pairing, on the page rather than behind a button: the
	// other device scans this or types it. The code-entry half is the dialog the list
	// below opens, so both directions are offered from this one screen and neither is
	// a role the user has to choose.
	//
	// One code is asked for when the page loads, so the card is ready the moment
	// someone lifts the veil. That costs a live session at the broker for as long as
	// the code lasts, and it is worth the one request: the alternative made the first
	// look at your own code a wait.

	let code = $state<PairCode | null>(null)
	let making = $state(false)
	let copied = $state(false)
	let hidden = $state(true)
	/** Whole seconds since this code was shown, ticked by the interval below. */
	let elapsed = $state(0)
	/** The other device redeemed this code, so it is gone whatever the clock says. */
	let used = $state(false)

	const remaining = $derived(code ? Math.max(0, code.seconds - elapsed) : 0)
	const spent = $derived(code !== null && (used || remaining === 0))
	const clock = $derived(`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`)

	async function showCode() {
		making = true
		copied = false
		used = false
		elapsed = 0
		try {
			code = await pairing.showCode()
		} catch {
			toast.error("Couldn't make a code. Try again in a moment.")
		} finally {
			making = false
		}
	}

	// One code on load. `tried` is a plain flag, not state: a failed attempt must not
	// re-run this effect, and `making` flipping back to false would otherwise do
	// exactly that, forever. A spent code is replaced from its own control, not here.
	let tried = false
	$effect(() => {
		if (tried || code || making || !pairing.available) return
		tried = true
		void showCode()
	})

	// A live code ages whether or not anyone is looking at it. Reads only `code`, so
	// it is not restarted by its own ticking.
	$effect(() => {
		if (!code) return
		const total = code.seconds
		const id = setInterval(() => {
			elapsed += 1
			if (elapsed >= total) clearInterval(id)
		}, 1000)
		return () => clearInterval(id)
	})

	// A request against the code we are showing means it has been used. The confirm
	// prompt is someone else's job; this only has to stop offering a dead code.
	$effect(() => {
		if (code && pairing.request) used = true
	})

	// Cover a spent code rather than leaving a dead one on display.
	$effect(() => {
		if (spent) hidden = true
	})

	async function copyCode() {
		if (!code) return
		try {
			await Clipboard.SetText(code.code)
			copied = true
			void haptics.copied()
			setTimeout(() => (copied = false), 2000)
		} catch {
			toast.error("Couldn't copy that.")
		}
	}

	// Deliberately does not clear `code` first. Emptying it dropped the actions row and
	// blanked the code line, so asking for a new code shuffled everything under it; the
	// old code just stays put until the new one replaces it in place.
	async function newCode() {
		await showCode()
	}
</script>

<section class="flex flex-col gap-2">
	<div class="flex flex-col gap-1">
		<h2 class="text-base font-medium">Your code</h2>
		<p class="text-sm text-muted-foreground">Scan or type it on the device you want to add.</p>
	</div>

	<!-- Fixed height, not content height: the card is the same box while a code is on
	     its way, once it is showing, and after it has been spent, so nothing on this
	     page moves when a code is minted, replaced, or used up. -->
	<div class="relative flex h-64 items-center justify-center">
		{#if spent}
			<!-- The dead code is gone rather than dimmed: a blurred QR is still a QR
			     someone can lift the veil off and scan. What to do about it is the row
			     below, which is the same row that was there a second ago. -->
			<p class="text-sm text-muted-foreground">
				{used ? 'That code has been used.' : 'That code has run out.'}
			</p>
		{:else}
			<!-- One toggle covers the whole card: the QR and the code text are the same
			     secret, so revealing one reveals both. The code's line has a reserved
			     height, because the longest code this app can generate is 34 characters
			     and code text may not go below 16px on a coarse pointer
			     (`interaction`): it wraps into space that was already there rather than
			     growing the card. -->
			<RevealVeil bind:hidden label="the code">
				<Card.Root class="w-full cursor-pointer items-center gap-0 py-4">
					<Card.Content class="bg-qr-background rounded-2xl border p-3">
						{#if code}
							<QRCode value={code.code} class="size-36" />
						{:else}
							<div class="flex size-36 items-center justify-center">
								{#if making}
									<Spinner class="size-5 text-muted-foreground" />
								{/if}
							</div>
						{/if}
					</Card.Content>
					<Card.Footer
						class="h-14 items-center justify-center px-2 text-center font-mono text-base font-medium sm:text-lg"
					>
						{code?.code ?? ''}
					</Card.Footer>
				</Card.Root>
			</RevealVeil>

			{#if code}
				<!-- The clock sits on the card but outside the veil: it is not part of the
				     secret, so it stays readable while the code is still covered, and
				     pointer-events-none keeps the whole card one press to reveal. -->
				<span
					class="pointer-events-none absolute top-3 right-3 rounded-full bg-background/90 px-2 py-0.5 font-mono text-xs text-muted-foreground"
				>
					{clock}
				</span>
			{/if}
		{/if}
	</div>

	<!-- One row, always here, whatever state the code is in: it holds its place while a
	     code is on its way, while one is live, and after one has been used up. Every
	     version of it appearing and disappearing was the layout shifting under the list
	     below.
	     Live, there is one thing to do: copy it. Replacing a code that still works is
	     not worth a control of its own — the code replaces itself when it runs out, and
	     that is the only moment the offer is useful. -->
	<div class="flex items-center gap-2">
		{#if spent}
			<Button class="flex-1" onclick={newCode} disabled={making}>
				{#if making}
					<Spinner data-icon="inline-start" />
					Making a code…
				{:else}
					<RefreshCwIcon data-icon="inline-start" />
					Show a new code
				{/if}
			</Button>
		{:else}
			<Button variant="secondary" class="flex-1" disabled={!code} onclick={copyCode}>
				{#if copied}
					<CheckIcon data-icon="inline-start" />
					Copied
				{:else}
					<CopyIcon data-icon="inline-start" />
					Copy code
				{/if}
			</Button>
		{/if}
	</div>
</section>
