<script lang="ts">
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Switch } from '$lib/components/ui/switch'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import SunIcon from '@lucide/svelte/icons/sun'
	import { setMode, userPrefersMode } from 'mode-watcher'

	// UI stub — settings controls are local-only, wired to nothing yet.
	let notifyOnComplete = $state(true)
	let folderPerCode = $state(true)

	// Theme is real: mode-watcher persists the preference and resolves `system`
	// against the OS. userPrefersMode holds the stored choice, setMode writes it.
	const themes = [
		{ value: 'light', label: 'Light', icon: SunIcon },
		{ value: 'system', label: 'System', icon: LaptopIcon },
		{ value: 'dark', label: 'Dark', icon: MoonIcon }
	] as const

	type Theme = (typeof themes)[number]['value']
</script>

<Field.FieldGroup>
	<Field.FieldSet>
		<Field.FieldLegend>General</Field.FieldLegend>
		<Field.Field>
			<Field.FieldLabel for="download-dir">Save files to</Field.FieldLabel>
			<Input id="download-dir" value="~/Downloads" readonly />
			<Field.FieldDescription>This is where your files land.</Field.FieldDescription>
		</Field.Field>
	</Field.FieldSet>

	<Field.FieldSeparator />

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

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend>Transfers</Field.FieldLegend>
		<Field.Field orientation="horizontal">
			<Field.FieldContent>
				<Field.FieldLabel for="notify">Tell me when a transfer finishes</Field.FieldLabel>
			</Field.FieldContent>
			<Switch id="notify" bind:checked={notifyOnComplete} />
		</Field.Field>
		<Field.Field orientation="horizontal">
			<Field.FieldContent>
				<Field.FieldLabel for="folder-per-code">Give each transfer its own folder</Field.FieldLabel>
				<Field.FieldDescription>Keeps things tidy when you receive a lot.</Field.FieldDescription>
			</Field.FieldContent>
			<Switch id="folder-per-code" bind:checked={folderPerCode} />
		</Field.Field>
	</Field.FieldSet>

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend>Network</Field.FieldLegend>
		<Field.Field>
			<Field.FieldLabel for="relay">Your own relay</Field.FieldLabel>
			<!-- A host, not prose: no autocorrect, no autocapitalise, and a URL
			     keyboard on touch. -->
			<Input
				id="relay"
				placeholder="www.relay-floppy.com"
				inputmode="url"
				autocomplete="off"
				autocapitalize="none"
				spellcheck="false"
			/>
			<Field.FieldDescription>Leave this empty unless you know you need it.</Field.FieldDescription>
		</Field.Field>
	</Field.FieldSet>
</Field.FieldGroup>
