<script lang="ts">
	import EmptyHero from '$lib/components/feedback/EmptyHero.svelte'
	import * as Empty from '$lib/components/ui/empty'
	import { normal } from '$lib/motion'
	import { fade } from 'svelte/transition'
</script>

<!-- The idle screen is a hero, not a form: the code input itself lives in the
     card's anchored actions zone (thumb reach), same as every other primary. -->
<div class="flex min-h-0 flex-1 flex-col" in:fade={{ duration: normal() }}>
	<EmptyHero accent="receive">
		<div class="flex min-w-0 flex-col items-center gap-2">
			<Empty.Title>Got a code?</Empty.Title>
			<Empty.Description>Type or paste the code the sender gave you.</Empty.Description>
		</div>
	</EmptyHero>
</div>
