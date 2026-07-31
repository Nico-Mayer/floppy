<script lang="ts">
	import { Badge } from '$lib/components/ui/badge'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { cn } from '$lib/utils'
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical'

	// Says a surface is a preview: laid out, but not connected to anything yet.
	// Icon only, so it can sit beside a title on a narrow phone without stealing
	// the room a long title needs, with the explanation on hover or focus.
	//
	// The trigger is focusable on purpose. That is what makes it reachable on a
	// phone, where there is no hover: a tap focuses it and the tooltip opens.

	let { class: className, label = 'Preview' }: { class?: string; label?: string } = $props()
</script>

<Tooltip.Provider delayDuration={150}>
	<Tooltip.Root>
		<Tooltip.Trigger aria-label="{label}. Nothing here is hooked up yet." class={cn('flex', className)}>
			<Badge variant="outline" class="gap-0 px-1.5 text-muted-foreground">
				<FlaskConicalIcon class="size-3.5" />
			</Badge>
		</Tooltip.Trigger>
		<Tooltip.Content class="max-w-56 text-center">
			Just a preview. Nothing here is hooked up yet.
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
