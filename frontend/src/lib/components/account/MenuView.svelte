<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import {
		IconChevronRight,
		IconClockHour3,
		IconDevices,
		IconInfoCircle,
		IconLogin2,
		IconSettings,
		IconUser
	} from '@tabler/icons-svelte'
	import { pairing } from '$lib/pairing-app.svelte'
	import type { View } from './types'

	let { navigate }: { navigate: (v: View) => void } = $props()

	// A row that says "None yet" is an invitation; a bare label is furniture. The
	// count is the hub's only hint that pairing exists at all — and once it reads
	// a number, it is also how anyone finds their way back to add the next one.
	const deviceHint = $derived(
		!pairing.available
			? 'Unavailable'
			: pairing.devices.length === 0
				? 'None yet'
				: `${pairing.devices.length} paired`
	)
</script>

{#snippet row(label: string, Icon: typeof IconSettings, target: View, hint?: string)}
	<button
		class={[
			buttonVariants({ variant: 'ghost' }),
			'h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-base font-normal'
		]}
		onclick={() => navigate(target)}
	>
		<Icon class="size-5 text-muted-foreground" />
		<span class="flex-1 text-left">{label}</span>
		{#if hint}
			<span class="shrink-0 text-sm text-muted-foreground">{hint}</span>
		{/if}
		<IconChevronRight class="size-4 text-muted-foreground" />
	</button>
{/snippet}

<!-- Signed-out identity card. -->
<div class="flex flex-col items-center gap-3 py-4 text-center">
	<Avatar.Root class="size-16">
		<Avatar.Image src="https://api.dicebear.com/10.x/initial-face/svg?seed=Nico"></Avatar.Image>
		<Avatar.Fallback><IconUser class="size-7" /></Avatar.Fallback>
	</Avatar.Root>
	<div class="flex flex-col gap-0.5">
		<p class="font-medium">Not signed in</p>
		<p class="text-sm text-muted-foreground">Sign in to sync your trusted devices.</p>
	</div>
	<Button onclick={() => navigate('login')}>
		<IconLogin2 data-icon="inline-start" />
		Sign in
	</Button>
</div>

<Field.FieldSeparator />

<nav class="flex flex-col gap-0.5">
	{@render row('Activity', IconClockHour3, 'activity')}
	{@render row('Settings', IconSettings, 'settings')}
	{@render row('Trusted devices', IconDevices, 'devices', deviceHint)}
</nav>

<Field.FieldSeparator />

<div class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
	<IconInfoCircle class="size-4" />
	<span>Floppy — no cloud, peer to peer.</span>
</div>
