<script lang="ts">
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Switch } from '$lib/components/ui/switch'

	// UI stub — settings controls are local-only, wired to nothing yet.
	let notifyOnComplete = $state(true)
	let folderPerCode = $state(true)
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
