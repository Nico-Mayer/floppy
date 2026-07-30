<script lang="ts">
	import { Spinner } from '$lib/components/ui/spinner'

	// The small "still working" line at the foot of a transfer panel: a spinner
	// beside a tiny uppercase status word.
	let { label }: { label: string } = $props()
</script>

<div class="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
	<Spinner class="size-3.5" />
	{label}
</div>
