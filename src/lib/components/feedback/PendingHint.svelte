<script lang="ts">
	import { Spinner } from '$lib/components/ui/spinner'
	import { cn } from '$lib/utils'

	// The one inline pending report (`feedback`): a spinner beside what the app
	// is doing, in the three shapes the screens need.
	//
	// hint  — the tiny "still working" line at the foot of a transfer panel.
	// pill  — the report that stands in a control's slot, sized to the send pill
	//         it replaces (h-12, h-14 on a coarse pointer) so a crossfade between
	//         the two moves nothing.
	// stack — the centred spinner-over-sentence for an empty surface.
	//
	// role="status" announces the label once; the spinner is aria-hidden so a
	// screen reader does not get a stray "Loading" beside the sentence.
	let {
		label,
		variant = 'hint',
		class: className
	}: {
		label: string
		variant?: 'hint' | 'pill' | 'stack'
		class?: string
	} = $props()
</script>

{#if variant === 'pill'}
	<div
		role="status"
		class={cn(
			'flex h-12 w-full items-center justify-center gap-2 rounded-full border border-(--tint)/30 bg-(--tint)/10 px-4 text-sm font-medium text-(--tint) pointer-coarse:h-14',
			className
		)}
	>
		<Spinner aria-hidden="true" />
		{label}
	</div>
{:else if variant === 'stack'}
	<div role="status" class={cn('flex min-w-0 flex-col items-center gap-2', className)}>
		<Spinner aria-hidden="true" size="control" class="text-muted-foreground" />
		<p class="text-sm text-muted-foreground">{label}</p>
	</div>
{:else}
	<div
		role="status"
		class={cn(
			'flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase',
			className
		)}
	>
		<Spinner aria-hidden="true" />
		{label}
	</div>
{/if}
