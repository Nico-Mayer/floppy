<script lang="ts">
	import { receiveLink } from '$lib/code-link'
	import CopyButton from '$lib/components/feedback/CopyButton.svelte'
	import PendingHint from '$lib/components/feedback/PendingHint.svelte'
	import BorderBeam from '$lib/components/magic/border-beam/border-beam.svelte'
	import { QRCode } from '$lib/components/spell/qrcode'
	import * as InputGroup from '$lib/components/ui/input-group'
	import { motionOK, normal } from '$lib/motion'
	import { fade } from 'svelte/transition'

	let { code }: { code: string } = $props()
</script>

<!-- 'waiting' for a code target: the phrase is live and anyone holding it can
     take the files. Entrance-only fade — the outgoing state is removed at once,
     so no two states occupy the card together and the layout cannot jump. -->
<div class="flex flex-1 flex-col items-center justify-center gap-7" in:fade={{ duration: normal() }}>
	<div class="flex flex-col items-center gap-1.5 text-center">
		<p class="animate-pop text-lg font-bold tracking-tight">Ready to share</p>
		<p class="max-w-64 text-xs text-muted-foreground">
			Scan this on the other device, or read the code out to them.
		</p>
	</div>

	<!-- Scanning is a phone-held-up gesture, so compact cards lead with a large
	     QR; in a regular-width card it recedes beside the phrase. Container
	     variants, not viewport: the card is the layout unit.
	     The QR carries a link, not the bare code: both of the app's codes look
	     alike, so the link is what tells a scan it is a share code and not a
	     pairing one (see code-link.ts). The phrase beside it stays bare — that is
	     the thing a person reads out or types. -->
	<div class="flex w-full max-w-md flex-col items-center gap-5 @md:max-w-lg @md:flex-row @md:gap-6">
		<div class="relative shrink-0 rounded-2xl border p-4 @md:p-3">
			<QRCode bgColor="var(--background)" value={receiveLink(code)} class="size-44 @md:size-32" />
			{#if motionOK()}
				<BorderBeam size={70} duration={5} colorFrom="var(--tint)" colorTo="var(--tint-fg)" />
			{/if}
		</div>
		<div class="flex w-full min-w-0 flex-col items-center gap-2.5 @md:items-start">
			<InputGroup.Root>
				<InputGroup.Input readonly value={code} class="font-mono font-medium" />
				<InputGroup.Addon align="inline-end">
					<CopyButton text={code} variant="icon" />
				</InputGroup.Addon>
			</InputGroup.Root>
			<PendingHint label="Valid until you close Floppy" />
		</div>
	</div>
</div>
