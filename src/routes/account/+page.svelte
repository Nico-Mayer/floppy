<script lang="ts">
	import AccountView from '$lib/components/account/AccountView.svelte'
	import PageHeader from '$lib/components/shell/PageHeader.svelte'
	import PageShell from '$lib/components/shell/PageShell.svelte'
	import { isStub } from '$lib/nav-items'
</script>

<PageShell scroll>
	<PageHeader title="Account" description="Your devices, wherever you sign in." stub={isStub('/account')} />
	<AccountView />
</PageShell>
