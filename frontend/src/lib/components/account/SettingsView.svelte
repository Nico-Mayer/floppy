<script lang="ts">
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Switch } from '$lib/components/ui/switch'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import { IconDeviceLaptop, IconMoon, IconSun } from '@tabler/icons-svelte'
	import { setMode, userPrefersMode } from 'mode-watcher'

	// UI stub — settings controls are local-only, wired to nothing yet.
	let notifyOnComplete = $state(true)
	let folderPerCode = $state(true)

	// Theme is real: mode-watcher persists the preference and resolves `system`
	// against the OS. userPrefersMode holds the stored choice, setMode writes it.
	const themes = [
		{ value: 'light', label: 'Light', icon: IconSun },
		{ value: 'system', label: 'System', icon: IconDeviceLaptop },
		{ value: 'dark', label: 'Dark', icon: IconMoon }
	] as const

	type Theme = (typeof themes)[number]['value']
</script>

<Field.FieldGroup>
	<Field.FieldSet>
		<Field.FieldLegend>General</Field.FieldLegend>
		<Field.Field>
			<Field.FieldLabel for="download-dir">Download location</Field.FieldLabel>
			<Input id="download-dir" value="~/Downloads" readonly />
			<Field.FieldDescription>Where received files are saved.</Field.FieldDescription>
		</Field.Field>
	</Field.FieldSet>

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend>Appearance</Field.FieldLegend>
		<Field.FieldDescription>Follow the system, or hold one theme.</Field.FieldDescription>
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
				<Field.FieldLabel for="notify">Notify when a transfer completes</Field.FieldLabel>
			</Field.FieldContent>
			<Switch id="notify" bind:checked={notifyOnComplete} />
		</Field.Field>
		<Field.Field orientation="horizontal">
			<Field.FieldContent>
				<Field.FieldLabel for="folder-per-code">Folder per code</Field.FieldLabel>
				<Field.FieldDescription>Save each transfer under its own code.</Field.FieldDescription>
			</Field.FieldContent>
			<Switch id="folder-per-code" bind:checked={folderPerCode} />
		</Field.Field>
	</Field.FieldSet>

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend>Network</Field.FieldLegend>
		<Field.Field>
			<Field.FieldLabel for="relay">Relay address</Field.FieldLabel>
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
			<Field.FieldDescription>Leave blank to use the default relay.</Field.FieldDescription>
		</Field.Field>
	</Field.FieldSet>
</Field.FieldGroup>
