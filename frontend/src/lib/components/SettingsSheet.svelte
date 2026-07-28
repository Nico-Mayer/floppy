<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Sheet from '$lib/components/ui/sheet'
	import { Switch } from '$lib/components/ui/switch'
	import { IconSettings } from '@tabler/icons-svelte'

	// UI stub — every control below is local-only and wired to nothing. It
	// exists to shape the Settings surface; persistence comes later.
	let notifyOnComplete = $state(true)
	let folderPerCode = $state(true)
</script>

<Sheet.Root>
	<Sheet.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label="Settings">
		<IconSettings />
	</Sheet.Trigger>

	<Sheet.Content class="flex flex-col">
		<Sheet.Header>
			<Sheet.Title>Settings</Sheet.Title>
			<Sheet.Description>Preferences aren't wired up yet.</Sheet.Description>
		</Sheet.Header>

		<div class="min-h-0 flex-1 overflow-y-auto px-4">
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
		</div>

		<Sheet.Footer>
			<Button disabled>Save</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
