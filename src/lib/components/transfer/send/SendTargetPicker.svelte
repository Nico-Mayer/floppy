<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button'
	import * as NativeSelect from '$lib/components/ui/native-select'
	import * as Select from '$lib/components/ui/select'
	import { pairing } from '$lib/pairing-app.svelte'
	import { isTouch } from '$lib/platform'
	import { cn } from '$lib/utils'
	import { resolve } from '$app/paths'
	import GlobeIcon from '@lucide/svelte/icons/globe'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import ShieldPlusIcon from '@lucide/svelte/icons/shield-plus'

	/** 'code' for the classic phrase send, otherwise a trusted device's fingerprint. */
	let { value = $bindable() }: { value: string } = $props()

	const CODE_LABEL = 'Anyone with a code'
	const DEVICES_LABEL = 'Your devices'
	const label = $derived(
		value === 'code' ? CODE_LABEL : (pairing.devices.find((d) => d.fingerprint === value)?.name ?? CODE_LABEL)
	)
</script>

<!-- The "who" half of the send row. There is no visible "Send to" label — the Send
     button sitting right of this is the rest of the sentence, and the row is one
     line so the queue above keeps the height. The accessible name moves onto the
     control itself.

     Pairing is offered from here only while nothing is paired, and the two states
     are exclusive: with no devices the picker would be a one-option control, so it
     is not rendered and the link takes its slot instead. That one link is the
     whole of pairing's presence on this screen. Without it Send would say nothing
     about devices at all and nobody would learn that sending without a code
     exists — the problem this entry was added to fix. Once a device is paired the
     picker itself is the standing evidence, and Devices is a top-level destination
     one tap away, so the permanent shortcut that used to sit here is gone: it was
     a cryptic glyph beside a select, explained by a tooltip a finger cannot open.

     The link is never an entry inside the picker. A picker's children are values:
     in the styled listbox bits' keyboard nav only walks [data-select-item] nodes,
     so a command in there would be a value by ARIA and mouse-only by keyboard, and
     an <option> in the native one is a value by definition. Either state is one
     row and Send does not move between them. -->
<div class="flex min-w-0 flex-1 items-center gap-2">
	{#if pairing.devices.length === 0}
		<!-- Devices live on their own page now; this is the way in from the send flow. -->
		<a
			href={resolve('/devices')}
			class={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'min-w-0 shrink justify-start')}
		>
			<ShieldPlusIcon data-icon="inline-start" />
			<span class="truncate">Add a device and skip the code</span>
		</a>
	{:else}
		<!-- Coarse pointer hands the choice to the OS picker: it is drawn, scrolled,
		     and dismissed the way every other picker on the device is, and it is
		     finger-sized without us asking. The two controls share one bound value
		     and one option set, so swapping between them (plugging in a mouse) keeps
		     the selection. The native one cannot draw the globe/laptop glyphs, so the
		     optgroup label carries the structure instead and the code option leans on
		     its own self-describing text. -->
		{#if isTouch()}
			<NativeSelect.Root bind:value aria-label="Send to" class="w-full min-w-0">
				<NativeSelect.Option value="code">{CODE_LABEL}</NativeSelect.Option>
				<NativeSelect.OptGroup label={DEVICES_LABEL}>
					{#each pairing.devices as device (device.fingerprint)}
						<NativeSelect.Option value={device.fingerprint}>{device.name}</NativeSelect.Option>
					{/each}
				</NativeSelect.OptGroup>
			</NativeSelect.Root>
		{:else}
			<Select.Root type="single" bind:value>
				<!-- truncate, not the row growing: a long device name shortens rather than
				     pushing Send off the edge of a phone-width card. -->
				<Select.Trigger aria-label="Send to" class="w-full min-w-0">
					{#if value === 'code'}
						<GlobeIcon class="text-muted-foreground" />
					{:else}
						<LaptopIcon class="text-muted-foreground" />
					{/if}
					<span class="truncate">{label}</span>
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
						<Select.GroupHeading>{DEVICES_LABEL}</Select.GroupHeading>
						{#each pairing.devices as device (device.fingerprint)}
							<Select.Item value={device.fingerprint} label={device.name}>
								<LaptopIcon class="text-muted-foreground" />
								{device.name}
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
		{/if}
	{/if}
</div>
