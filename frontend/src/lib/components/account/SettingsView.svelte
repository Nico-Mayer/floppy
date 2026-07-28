<script lang="ts">
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Select from '$lib/components/ui/select'
	import { Switch } from '$lib/components/ui/switch'
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

	const activeTheme = $derived(themes.find((t) => t.value === userPrefersMode.current) ?? themes[1])
</script>

<Field.FieldGroup>
	<Field.FieldSet>
		<Field.FieldLegend>General</Field.FieldLegend>
		<Field.Field>
			<Field.FieldLabel for="download-dir">Download location</Field.FieldLabel>
			<Input id="download-dir" value="~/Downloads" readonly />
			<Field.FieldDescription>Where received files are saved.</Field.FieldDescription>
		</Field.Field>
		<Field.Field orientation="horizontal">
			<Field.FieldContent>
				<Field.FieldLabel for="theme">Theme</Field.FieldLabel>
			</Field.FieldContent>
			<Select.Root
				type="single"
				value={userPrefersMode.current}
				onValueChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
			>
				<Select.Trigger id="theme" class="w-36">
					<activeTheme.icon class="size-4 text-muted-foreground" />
					{activeTheme.label}
				</Select.Trigger>
				<Select.Content>
					{#each themes as theme (theme.value)}
						<Select.Item value={theme.value} label={theme.label}>
							<theme.icon class="size-4 text-muted-foreground" />
							{theme.label}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
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
			<Input id="relay" placeholder="www.relay-floppy.com" />
			<Field.FieldDescription>Leave blank to use the default relay.</Field.FieldDescription>
		</Field.Field>
	</Field.FieldSet>
</Field.FieldGroup>
