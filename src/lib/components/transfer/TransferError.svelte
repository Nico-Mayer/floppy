<script lang="ts">
	import * as Alert from '$lib/components/ui/alert'
	import { Button } from '$lib/components/ui/button'
	import { normal, shift } from '$lib/motion'
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert'
	import XIcon from '@lucide/svelte/icons/x'
	import { fly } from 'svelte/transition'
	import type { AppError } from '$lib/errors'

	// One side's failure, on that side's own screen. Send and Receive each own an
	// error, so this renders per route rather than once for the app — and one
	// dismissal leaves the other side's alert alone. Shared as a component because
	// the two routes want the identical treatment, not a similar one.
	let {
		error,
		ondismiss
	}: {
		error: AppError | null
		ondismiss: () => void
	} = $props()
</script>

{#if error}
	<div transition:fly={{ y: -shift(), duration: normal() }}>
		<Alert.Root variant="destructive" class="animate-shake">
			<CircleAlertIcon />
			<Alert.Title>{error.title}</Alert.Title>
			<!-- detail holds the transport's original wording whenever we replaced it
			     with something friendlier; surface it on hover rather than throwing raw
			     text at the user. -->
			<Alert.Description title={error.detail}>
				{error.message}
			</Alert.Description>
			<Alert.Action>
				<Button variant="ghost" size="icon-xs" onclick={ondismiss} aria-label="Dismiss">
					<XIcon />
				</Button>
			</Alert.Action>
		</Alert.Root>
	</div>
{/if}
