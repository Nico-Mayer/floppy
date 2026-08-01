<script lang="ts">
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import SettingsView from '$lib/components/settings/SettingsView.svelte'
	import { isStub } from '$lib/nav-items'
</script>

<PageShell scroll>
	<PageHeader title="Settings" description="Tune how Floppy looks and connects." stub={isStub('/settings')} />
	<SettingsView />
</PageShell>
