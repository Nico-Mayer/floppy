<script lang="ts">
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import { Button } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Switch } from '$lib/components/ui/switch'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import { DownloadRoot, OpenPath } from '$lib/ipc'
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import SunIcon from '@lucide/svelte/icons/sun'
	import { setMode, userPrefersMode } from 'mode-watcher'
	import { onMount } from 'svelte'

	// Desktop-only screen: phones follow the system theme and keep their deep
	// settings in the OS, so this destination is not in phone navigation at all.
	//
	// The page is no longer marked as a preview page-wide. Appearance and
	// Downloads are real; the two sections that are not carry their own marks,
	// so a marker never claims a working control is a stub.

	// Preview: this switch is local-only, wired to nothing yet. It stays
	// interactive on purpose, so its states can be reviewed — the section's own
	// StubMark is what says it is not hooked up. Anything that would state a
	// *wrong* value was deleted rather than marked; see the notes below.
	let notifyOnComplete = $state(true)

	// Theme is real: mode-watcher persists the preference and resolves `system`
	// against the OS. userPrefersMode holds the stored choice, setMode writes it.
	const themes = [
		{ value: 'light', label: 'Light', icon: SunIcon },
		{ value: 'system', label: 'System', icon: LaptopIcon },
		{ value: 'dark', label: 'Dark', icon: MoonIcon }
	] as const

	type Theme = (typeof themes)[number]['value']

	// The real resolved download root, read from the same resolver transfers
	// use. Null until it arrives, and null if the read fails: showing nothing is
	// honest, showing a guessed path is not. (The browser preview has no IPC
	// bridge, so there the section simply never appears.)
	let downloadRoot = $state<string | null>(null)

	onMount(async () => {
		try {
			downloadRoot = await DownloadRoot()
		} catch {
			downloadRoot = null
		}
	})
</script>

<Field.FieldGroup>
	<Field.FieldSet>
		<Field.FieldLegend>Appearance</Field.FieldLegend>
		<Field.FieldDescription>Match your system, or pick one and stick with it.</Field.FieldDescription>
		<!-- Three mutually exclusive options, so a segmented control rather than a
		     Select: every state is visible and one tap away.
		     mode-watcher owns the value — the getter reads the stored choice back
		     and the setter feeds setMode, which also pins the control: a single
		     ToggleGroup lets you deselect the active item, and swallowing that
		     empty value keeps one theme always selected. -->
		<ToggleGroup.Root
			type="single"
			variant="outline"
			aria-label="Theme"
			class="w-full *:flex-1"
			bind:value={() => userPrefersMode.current ?? 'system', (next) => next && setMode(next as Theme)}
		>
			{#each themes as theme (theme.value)}
				<ToggleGroup.Item value={theme.value}>
					<theme.icon data-icon="inline-start" />
					{theme.label}
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</Field.FieldSet>

	{#if downloadRoot !== null}
		<Field.FieldSeparator />

		<Field.FieldSet>
			<Field.FieldLegend>Downloads</Field.FieldLegend>
			<Field.FieldDescription>Every transfer gets its own folder in here.</Field.FieldDescription>
			<!-- The value is the truth, read from the app, so it may be shown; it is
			     not editable, because the root is not a preference. No "give each
			     transfer its own folder" switch either: that behaviour is
			     unconditional, and a switch would offer a choice that does not
			     exist. -->
			<Field.Field orientation="horizontal">
				<Field.FieldContent>
					<p class="truncate text-sm" title={downloadRoot}>{downloadRoot}</p>
				</Field.FieldContent>
				<Button variant="outline" onclick={() => downloadRoot && OpenPath(downloadRoot)}>
					<FolderOpenIcon data-icon="inline-start" />
					Open folder
				</Button>
			</Field.Field>
		</Field.FieldSet>
	{/if}

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend class="flex items-center gap-2">
			Transfers
			<StubMark />
		</Field.FieldLegend>
		<Field.Field orientation="horizontal">
			<Field.FieldContent>
				<Field.FieldLabel for="notify">Tell me when a transfer finishes</Field.FieldLabel>
			</Field.FieldContent>
			<Switch id="notify" bind:checked={notifyOnComplete} />
		</Field.Field>
	</Field.FieldSet>

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend class="flex items-center gap-2">
			Network
			<StubMark />
		</Field.FieldLegend>
		<Field.Field>
			<Field.FieldLabel for="relay">Your own relay</Field.FieldLabel>
			<!-- A host, not prose: no autocorrect, no autocapitalise, and a URL
			     keyboard on touch. The placeholder describes the field rather than
			     imitating a real hostname, which read as a live default. -->
			<Input
				id="relay"
				placeholder="Your relay's address"
				inputmode="url"
				autocomplete="off"
				autocapitalize="none"
				spellcheck="false"
			/>
			<Field.FieldDescription>Leave this empty unless you know you need it.</Field.FieldDescription>
		</Field.Field>
	</Field.FieldSet>
</Field.FieldGroup>
