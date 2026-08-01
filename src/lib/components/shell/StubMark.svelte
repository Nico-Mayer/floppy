<script lang="ts">
	import { Badge } from '$lib/components/ui/badge'
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical'

	let {
		class: className
	}: {
		class?: string
	} = $props()
</script>

<Badge variant="outline" class="gap-0 px-1.5 text-muted-foreground {className}">
	<FlaskConicalIcon class="size-3.5" />
</Badge>
