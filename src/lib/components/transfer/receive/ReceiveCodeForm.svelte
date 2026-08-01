<script lang="ts">
	import CodeInput from '$lib/components/CodeInput.svelte'
	import { Button } from '$lib/components/ui/button'
	import { isCompleteCode } from '$lib/code'
	import { app } from '$lib/transfer-app.svelte'
	import DownloadIcon from '@lucide/svelte/icons/download'

	const receive = app.receive
</script>

<!-- The code group is the panel's real primary — it lives in the anchored action
     zone (thumb reach), width-capped once the card is wide so it never stretches
     into a ribbon. -->
<div class="flex w-full flex-col gap-2 @sm:mx-auto @sm:max-w-sm">
	<CodeInput bind:value={receive.code} class="text-center" onsubmit={() => receive.start()} />
	<Button class="w-full" onclick={() => receive.start()} disabled={!isCompleteCode(receive.code)}>
		<DownloadIcon />
		Get the files
	</Button>
</div>
