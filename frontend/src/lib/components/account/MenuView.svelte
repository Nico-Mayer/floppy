<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import {
		IconChevronRight,
		IconDevices,
		IconInfoCircle,
		IconLogin2,
		IconSettings,
		IconUser
	} from '@tabler/icons-svelte'
	import type { View } from './types'

	let { navigate }: { navigate: (v: View) => void } = $props()
</script>

{#snippet row(label: string, Icon: typeof IconSettings, target: View)}
	<button
		class={[
			buttonVariants({ variant: 'ghost' }),
			'h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-base font-normal'
		]}
		onclick={() => navigate(target)}
	>
		<Icon class="size-5 text-muted-foreground" />
		<span class="flex-1 text-left">{label}</span>
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
	{@render row('Settings', IconSettings, 'settings')}
	{@render row('Trusted devices', IconDevices, 'devices')}
</nav>

<Field.FieldSeparator />

<div class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
	<IconInfoCircle class="size-4" />
	<span>Floppy — no cloud, peer to peer.</span>
</div>
