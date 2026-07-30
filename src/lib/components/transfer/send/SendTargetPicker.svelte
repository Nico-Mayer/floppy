<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import * as Select from '$lib/components/ui/select'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { pairing } from '$lib/pairing-app.svelte'
	import GlobeIcon from '@lucide/svelte/icons/globe'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import ShieldPlusIcon from '@lucide/svelte/icons/shield-plus'

	/** 'code' for the classic phrase send, otherwise a trusted device's fingerprint. */
	let { value = $bindable() }: { value: string } = $props()

	const CODE_LABEL = 'Anyone with a code'
	const label = $derived(
		value === 'code' ? CODE_LABEL : (pairing.devices.find((d) => d.fingerprint === value)?.name ?? CODE_LABEL)
	)
</script>

<!-- This is where the user decides who the files are going to, so pairing is
     offered from here — it used to be the one screen that said nothing about
     devices at all, three taps away from the only way to add one.
     The offer stays put once devices exist rather than only filling the empty
     state: pairing is mutual and per-peer, so "add another" is a recurring need,
     and an affordance that vanishes after the first success never taught anyone
     where it went. It is a link beside the picker, not an item inside it —
     Select.Content is a listbox whose children are options, i.e. values, and
     bits' keyboard nav only walks [data-select-item] nodes, so a command in
     there would be a value by ARIA and mouse-only by keyboard.
     With nothing paired the Select would be a one-option control, so the link
     stands alone and carries the explanation instead. -->
{#if pairing.devices.length === 0}
	<!-- Pairing lives on its own page now; this is the way in from the send flow. -->
	<a href="/pair" class={buttonVariants({ variant: 'link', size: 'sm' })}>
		<ShieldPlusIcon data-icon="inline-start" />
		Pair a device and skip the code
	</a>
{:else}
	<Field.Field class="gap-2">
		<div class="flex items-center justify-between gap-2">
			<Field.FieldLabel for="send-target" class="font-normal">Send to</Field.FieldLabel>
			<Tooltip.Provider delayDuration={150}>
				<Tooltip.Root>
					<Tooltip.Trigger
						class={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' -my-1'}
						aria-label="Pair a device"
					>
						{#snippet child({ props })}
							<a href="/pair" {...props}>
								<ShieldPlusIcon />
							</a>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>Pair a device</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
		<Select.Root type="single" bind:value>
			<Select.Trigger id="send-target" class="w-full">
				{#if value === 'code'}
					<GlobeIcon class="text-muted-foreground" />
				{:else}
					<LaptopIcon class="text-muted-foreground" />
				{/if}
				{label}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Item value="code" label={CODE_LABEL}>
						<GlobeIcon class="text-muted-foreground" />
						{CODE_LABEL}
					</Select.Item>
				</Select.Group>
				<Select.Separator />
				<Select.Group>
					<Select.GroupHeading>Your devices</Select.GroupHeading>
					{#each pairing.devices as device (device.fingerprint)}
						<Select.Item value={device.fingerprint} label={device.name}>
							<LaptopIcon class="text-muted-foreground" />
							{device.name}
						</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
	</Field.Field>
{/if}
