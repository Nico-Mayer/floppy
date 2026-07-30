<script lang="ts">
	import SettingsView from '$lib/components/account/SettingsView.svelte'
</script>

<div class="h-full overflow-y-auto">
	<div
		class="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 max-sm:pb-[max(--spacing(4),env(safe-area-inset-bottom))] sm:p-6"
	>
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
			<p class="text-sm text-muted-foreground">Tune how Floppy saves, looks, and connects.</p>
		</div>
		<SettingsView />
	</div>
</div>
