<script lang="ts">
	import ActivityView from '$lib/components/activity/ActivityView.svelte'
</script>

<div class="h-full overflow-y-auto">
	<div class="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 sm:p-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">Activity</h1>
			<p class="text-sm text-muted-foreground">A log of everything you've sent and received.</p>
		</div>
		<ActivityView />
	</div>
</div>
