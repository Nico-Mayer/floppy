<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Empty from '$lib/components/ui/empty'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import * as Sheet from '$lib/components/ui/sheet'
	import { Switch } from '$lib/components/ui/switch'
	import {
		IconBrandGoogle,
		IconChevronLeft,
		IconChevronRight,
		IconDevices,
		IconInfoCircle,
		IconLogin2,
		IconSettings,
		IconUser
	} from '@tabler/icons-svelte'

	// In-sheet view stack — a stand-in for real routing. When Settings and
	// Trusted devices graduate to their own pages, each `view` becomes a
	// route and this switch goes away.
	type View = 'menu' | 'login' | 'settings' | 'devices'
	let view = $state<View>('menu')
	let open = $state(false)

	const titles: Record<View, string> = {
		menu: 'Account',
		login: 'Sign in',
		settings: 'Settings',
		devices: 'Trusted devices'
	}

	// UI stub — settings controls are local-only, wired to nothing yet.
	let notifyOnComplete = $state(true)
	let folderPerCode = $state(true)

	// Reopening always lands on the hub, never a stale sub-view.
	function onOpenChange(next: boolean) {
		open = next
		if (!next) view = 'menu'
	}
</script>

{#snippet row(label: string, Icon: typeof IconSettings, target: View)}
	<button
		class={[
			buttonVariants({ variant: 'ghost' }),
			'h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-base font-normal'
		]}
		onclick={() => (view = target)}
	>
		<Icon class="size-5 text-muted-foreground" />
		<span class="flex-1 text-left">{label}</span>
		<IconChevronRight class="size-4 text-muted-foreground" />
	</button>
{/snippet}

<Sheet.Root bind:open {onOpenChange}>
	<Sheet.Trigger
		class="rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		aria-label="Account"
	>
		<Avatar.Root class="size-8">
			<!-- No account yet — fallback only. -->
			<Avatar.Fallback><IconUser class="size-4" /></Avatar.Fallback>
		</Avatar.Root>
	</Sheet.Trigger>

	<!-- The panel always starts below the window titlebar so the OS controls
	     (Windows min/max/close, macOS traffic lights) stay visible and
	     clickable — TitleBar sits above the sheet in z-order. On mobile it goes
	     edge-to-edge, square and borderless, reading like a pushed screen. -->
	<Sheet.Content
		class="top-(--header-height)! flex h-[calc(100svh-var(--header-height))]! flex-col max-sm:w-full! max-sm:max-w-full! max-sm:border-0!"
	>
		<Sheet.Header class="flex-row items-center gap-1 space-y-0">
			{#if view !== 'menu'}
				<Button
					variant="ghost"
					size="icon-sm"
					class="-ml-1 shrink-0"
					onclick={() => (view = 'menu')}
					aria-label="Back"
				>
					<IconChevronLeft />
				</Button>
			{/if}
			<Sheet.Title>{titles[view]}</Sheet.Title>
		</Sheet.Header>

		<div
			class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 max-sm:pb-[max(--spacing(4),env(safe-area-inset-bottom))]"
		>
			{#if view === 'menu'}
				<!-- Signed-out identity card. -->
				<div class="flex flex-col items-center gap-3 py-4 text-center">
					<Avatar.Root class="size-16">
						<Avatar.Fallback><IconUser class="size-7" /></Avatar.Fallback>
					</Avatar.Root>
					<div class="flex flex-col gap-0.5">
						<p class="font-medium">Not signed in</p>
						<p class="text-sm text-muted-foreground">Sign in to sync your trusted devices.</p>
					</div>
					<Button onclick={() => (view = 'login')}>
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
			{:else if view === 'login'}
				<!-- UI stub — no submit handler. -->
				<Field.FieldGroup>
					<Field.Field>
						<Field.FieldLabel for="email">Email</Field.FieldLabel>
						<Input id="email" type="email" placeholder="you@example.com" />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="password">Password</Field.FieldLabel>
						<Input id="password" type="password" placeholder="••••••••" />
					</Field.Field>
					<Button class="w-full" disabled>Sign in</Button>
					<Field.FieldSeparator>or</Field.FieldSeparator>
					<Button variant="outline" class="w-full" disabled>
						<IconBrandGoogle data-icon="inline-start" />
						Continue with Google
					</Button>
					<Field.FieldDescription class="text-center">
						Accounts aren't available yet — this is a preview.
					</Field.FieldDescription>
				</Field.FieldGroup>
			{:else if view === 'settings'}
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
			{:else if view === 'devices'}
				<Empty.Root>
					<Empty.Header>
						<Empty.Media variant="icon">
							<IconDevices />
						</Empty.Media>
						<Empty.Title>No trusted devices</Empty.Title>
						<Empty.Description>
							Devices you mark as trusted will skip the code prompt. Sign in to start building your list.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
