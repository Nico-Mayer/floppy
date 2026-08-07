<script lang="ts">
	import { receiveLink } from '$lib/code-link'
	import CopyButton from '$lib/components/feedback/CopyButton.svelte'
	import PendingHint from '$lib/components/feedback/PendingHint.svelte'
	import BorderBeam from '$lib/components/magic/border-beam/border-beam.svelte'
	import QRCode from '$lib/components/QRCode.svelte'
	import * as InputGroup from '$lib/components/ui/input-group'
	import { motionOK, normal } from '$lib/motion'
	import { fade } from 'svelte/transition'

	let { code }: { code: string } = $props()
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-7" in:fade={{ duration: normal() }}>
	<div class="flex flex-col items-center gap-1.5 text-center">
		<p class="animate-pop text-lg font-bold tracking-tight">Ready to share</p>
		<p class="max-w-64 text-xs text-muted-foreground">
			Scan this on the other device, or read the code out to them.
		</p>
	</div>

	<div class="flex w-full max-w-md flex-col items-center gap-5">
		<div class="relative shrink-0 rounded-2xl border p-4">
			<QRCode value={receiveLink(code)} class="size-44" />
			{#if motionOK()}
				<BorderBeam size={70} duration={5} colorFrom="var(--tint)" colorTo="var(--tint-fg)" />
			{/if}
		</div>
		<div class="flex w-full min-w-0 flex-col items-center gap-2.5">
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
