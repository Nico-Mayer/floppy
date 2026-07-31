<script lang="ts">
	import { loadActivity, type ActivityEntry } from '$lib/components/activity/activity'
	import ActivityView from '$lib/components/activity/ActivityView.svelte'
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import { isStub } from '$lib/nav-items'
	import { onMount } from 'svelte'

	// Loading lives here rather than in the view so the pull-to-refresh gesture,
	// which belongs to the shell's scroller, has something to call.
	let entries = $state<ActivityEntry[] | null>(null)

	async function load() {
		entries = await loadActivity()
	}

	onMount(load)
</script>

<PageShell scroll onrefresh={load}>
	<PageHeader
		title="Activity"
		description="A log of everything you've sent and received."
		stub={isStub('/activity')}
	/>
	<ActivityView {entries} />
</PageShell>
