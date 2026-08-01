<script lang="ts">
	import { normal, shift } from '$lib/motion'
	import { app } from '$lib/transfer-app.svelte'
	import { fly } from 'svelte/transition'
	import TransferProgress from '../TransferProgress.svelte'

	const receive = app.receive
</script>

<!-- 'connecting' for a code target: a receive waits for its peer forever, so a wrong
     code looks exactly like a peer that has not shown up yet. -->
<TransferProgress label="Looking for the sender…" />
{#if receive.tooSlow}
	<!-- The only clue the user ever gets that they mistyped. It arrives on a
	     delay, so it slides in rather than blinking into place. -->
	<p class="text-center text-xs text-muted-foreground" transition:fly={{ y: shift(), duration: normal() }}>
		Still nothing. Check that
		<span class="font-mono text-foreground">{receive.code}</span>
		matches what the sender is showing.
	</p>
{/if}
