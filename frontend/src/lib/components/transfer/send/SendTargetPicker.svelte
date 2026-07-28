<script lang="ts">
	import * as Field from '$lib/components/ui/field'
	import * as Select from '$lib/components/ui/select'
	import { pairing } from '$lib/pairing-app.svelte'
	import { IconDeviceLaptop, IconWorld } from '@tabler/icons-svelte'

	/** 'code' for the classic phrase send, otherwise a trusted device's fingerprint. */
	let { value = $bindable() }: { value: string } = $props()

	const CODE_LABEL = 'Anyone with a code'
	const label = $derived(
		value === 'code' ? CODE_LABEL : (pairing.devices.find((d) => d.fingerprint === value)?.name ?? CODE_LABEL)
	)
</script>

<!-- Only worth a choice once there is something to choose: with no trusted
     devices every send is a code send. -->
{#if pairing.devices.length > 0}
	<Field.Field>
		<Field.FieldLabel for="send-target">Send to</Field.FieldLabel>
		<Select.Root type="single" bind:value>
			<Select.Trigger id="send-target" class="w-full">
				{#if value === 'code'}
					<IconWorld class="text-muted-foreground" />
				{:else}
					<IconDeviceLaptop class="text-muted-foreground" />
				{/if}
				{label}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Item value="code" label={CODE_LABEL}>
						<IconWorld class="text-muted-foreground" />
						{CODE_LABEL}
					</Select.Item>
				</Select.Group>
				<Select.Separator />
				<Select.Group>
					<Select.GroupHeading>Trusted devices</Select.GroupHeading>
					{#each pairing.devices as device (device.fingerprint)}
						<Select.Item value={device.fingerprint} label={device.name}>
							<IconDeviceLaptop class="text-muted-foreground" />
							{device.name}
						</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
	</Field.Field>
{/if}
