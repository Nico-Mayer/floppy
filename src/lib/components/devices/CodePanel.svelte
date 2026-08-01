<script lang="ts">
	import { QRCode } from '$lib/components/spell/qrcode'
	import { Button } from '$lib/components/ui/button'
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog'
	import { Spinner } from '$lib/components/ui/spinner'
	import { haptics } from '$lib/haptics'
	import { Clipboard, type PairCode } from '$lib/ipc'
	import { pairing } from '$lib/pairing-app.svelte'
	import CheckIcon from '@lucide/svelte/icons/check'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
	import { toast } from 'svelte-sonner'

	// This device's half of a pairing: the other device scans this or types it. A
	// panel opened from the page's heading rather than a section of the page,
	// because it matters only while a device is being added, and the page is for the
	// devices you already have.
	//
	// No cover over the code. The veil this used to carry existed because the code
	// sat on the page whether or not anyone wanted it there; opening a panel is that
	// intent, so covering the contents of a surface the user just opened is a tap
	// that protects nothing.

	let { open = $bindable(false) }: { open?: boolean } = $props()

	let code = $state<PairCode | null>(null)
	let making = $state(false)
	let copied = $state(false)
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

	// One code as the panel opens, and nothing left behind when it closes: a code
	// costs a live session at the broker for as long as it lasts, so a visit that
	// never opens this pays nothing.
	//
	// `tried` is a plain flag, not state: a failed attempt must not re-run this
	// effect, and `making` flipping back to false would otherwise do exactly that,
	// forever. A spent code is replaced from its own control, not here.
	let tried = false
	$effect(() => {
		if (!open) {
			tried = false
			code = null
			used = false
			elapsed = 0
			return
		}
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

	// A completed pairing is the reason this panel was open.
	let seenPaired = $state(pairing.paired)
	$effect(() => {
		if (pairing.paired === seenPaired) return
		seenPaired = pairing.paired
		open = false
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

	// Deliberately does not clear `code` first. Emptying it blanked the code line and
	// dropped the row under it, so asking for a new code shuffled the panel; the old
	// code just stays put until the new one replaces it in place.
	async function newCode() {
		await showCode()
	}
</script>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content class="sm:max-w-lg">
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Your code</ResponsiveDialog.Title>
			<ResponsiveDialog.Description
				>Scan or type it on the device you want to add.</ResponsiveDialog.Description
			>
		</ResponsiveDialog.Header>

		<ResponsiveDialog.Body class="flex flex-col gap-3">
			<!-- Fixed height, not content height: the same box while a code is on its
			     way, once it is showing, and after it has been spent, so nothing in the
			     panel moves when a code is minted, replaced, or used up. -->
			<div class="relative flex h-64 items-center justify-center">
				{#if spent}
					<!-- The dead code is gone rather than dimmed. What to do about it is the
					     row below, which is the same row that was there a second ago. -->
					<p class="text-sm text-muted-foreground">
						{used ? 'That code has been used.' : 'That code has run out.'}
					</p>
				{:else}
					<!-- No card around this. The panel is already a surface with its own edge,
					     and a card inside it was a second border saying the same thing.
					     The code's line keeps its reserved height, because the longest code
					     this app can generate is 34 characters and code text may not go below
					     16px on a coarse pointer (`interaction`): it wraps into space that was
					     already there rather than moving the QR. -->
					<div class="flex w-full flex-col items-center">
						<div class="bg-qr-background rounded-2xl border p-3">
							{#if code}
								<QRCode value={code.code} class="size-36" />
							{:else}
								<div class="flex size-36 items-center justify-center">
									{#if making}
										<Spinner class="size-5 text-muted-foreground" />
									{/if}
								</div>
							{/if}
						</div>
						<p
							class="flex h-14 items-center justify-center px-2 text-center font-mono text-base font-medium sm:text-lg"
						>
							{code?.code ?? ''}
						</p>
					</div>

					{#if code}
						<!-- The clock sits on the card rather than in a sentence beside it, and
						     is not a control. -->
						<span
							class="pointer-events-none absolute top-3 right-3 rounded-full bg-background/90 px-2 py-0.5 font-mono text-xs text-muted-foreground"
						>
							{clock}
						</span>
					{/if}
				{/if}
			</div>

			<!-- One row, always here, whatever state the code is in: it holds its place
			     while a code is on its way, while one is live, and after one has been
			     used up.
			     Live, there is one thing to do: copy it. Replacing a code that still
			     works is not worth a control of its own, since the panel replaces it the
			     moment it runs out. -->
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
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
