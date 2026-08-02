<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import SettingsView from '$lib/components/settings/SettingsView.svelte'
</script>

<!-- No page-wide preview marker: theme and the download folder are real now,
     and the sections that are not carry their own marks (see SettingsView). -->
<PageShell scroll>
	<PageHeader title="Settings" description="Tune how Floppy looks and connects." />
	<SettingsView />
</PageShell>
