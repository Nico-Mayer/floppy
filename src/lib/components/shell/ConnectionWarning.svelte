<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { health } from '$lib/health.svelte'
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off'

	// The one connection warning, shared by Send and Receive so its icon, tint,
	// wording, and disclosure cannot drift between them. Renders nothing while both
	// links are up or still unknown — a cold start has no relay for a second or two
	// by design, and warning about that would be noise.
	//
	// Sized like the heading's other trailing indications (size-4 in a flex
	// trigger), so appearing and disappearing never changes the bar's height.
	//
	// A warning, not a gate: nothing here disables a control. Two devices on one
	// network transfer fine with no relay, and a real failure reports itself in the
	// screen's error surface.
</script>

{#if health.warning}
	<Tooltip.Provider delayDuration={150}>
		<Tooltip.Root>
			<Tooltip.Trigger aria-label="Connection warning" class="flex text-amber-500">
				<WifiOffIcon class="size-4" />
			</Tooltip.Trigger>
			<Tooltip.Content class="max-w-56 text-center">
				{health.message}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
