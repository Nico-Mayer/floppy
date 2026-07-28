<script lang="ts">
	import * as Empty from '$lib/components/ui/empty'
	import { normal } from '$lib/motion'
	import { fade } from 'svelte/transition'
	import Mascot from '../Mascot.svelte'
</script>

<!-- The idle screen is a hero, not a form: the code input itself lives in the
     card's anchored actions zone (thumb reach), same as every other primary. -->
<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
	<!-- Compact: mascot shrinks and stacks. Regular (@md, card width): hero row —
	     mascot beside the copy, text left-aligned — so the branding stays without
	     spending the card's height on it. -->
	<Empty.Root class="p-6 @md:p-8">
		<Empty.Header class="@md:max-w-none @md:gap-6">
			<Empty.Media class="@md:mb-0">
				<Mascot accent="receive" class="size-20 @md:size-24" />
			</Empty.Media>
			<div class="flex min-w-0 flex-col items-center gap-2">
				<Empty.Title>Enter transfer code</Empty.Title>
				<Empty.Description>Paste the code given by the transmitter.</Empty.Description>
			</div>
		</Empty.Header>
	</Empty.Root>
</div>
