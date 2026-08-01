<script lang="ts">
	import LoginView from '$lib/components/auth/LoginView.svelte'
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { Switch } from '$lib/components/ui/switch'
	import * as ToggleGroup from '$lib/components/ui/toggle-group'
	import LaptopIcon from '@lucide/svelte/icons/laptop'
	import MoonIcon from '@lucide/svelte/icons/moon'
	import SunIcon from '@lucide/svelte/icons/sun'
	import { setMode, userPrefersMode } from 'mode-watcher'

	// Preview: this switch is local-only, wired to nothing yet. It stays
	// interactive on purpose, so its states can be reviewed — the page's own
	// StubMark is what says the screen is not hooked up. Anything that would state
	// a *wrong* value was deleted rather than marked; see the notes below.
	let notifyOnComplete = $state(true)

	// Theme is real: mode-watcher persists the preference and resolves `system`
	// against the OS. userPrefersMode holds the stored choice, setMode writes it.
	const themes = [
		{ value: 'light', label: 'Light', icon: SunIcon },
		{ value: 'system', label: 'System', icon: LaptopIcon },
		{ value: 'dark', label: 'Dark', icon: MoonIcon }
	] as const

	type Theme = (typeof themes)[number]['value']
</script>

<!-- There is no "Save files to" field here on purpose. It used to show a readonly
     `~/Downloads`, which is wrong on every mobile target: the real root is
     resolved per platform (desktop Downloads, Android public Downloads, iOS
     Documents) and each transfer gets its own datetime folder inside it. A
     preview marker does not make a wrong value right, so the field is gone until
     it can read the real one. -->
<Field.FieldGroup>
	<!-- Signing in lives here rather than behind a dialog: there is one place the
	     account is presented, and one way to reach it (the sidebar's account row
	     links here, and on mobile Settings is a bar destination). Marked as a
	     preview in its own legend the same way a preview route's header is —
	     the broker is accountless, and signing in would only sync your paired
	     devices between installs. -->
	<Field.FieldSet>
		<Field.FieldLegend class="flex items-center">
			Account
			<StubMark />
		</Field.FieldLegend>
		<Field.FieldDescription>Keep your paired devices in sync across installs.</Field.FieldDescription>
		<LoginView />
	</Field.FieldSet>

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend>Appearance</Field.FieldLegend>
		<Field.FieldDescription>Match your system, or pick one and stick with it.</Field.FieldDescription>
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
				<Field.FieldLabel for="notify">Tell me when a transfer finishes</Field.FieldLabel>
			</Field.FieldContent>
			<Switch id="notify" bind:checked={notifyOnComplete} />
		</Field.Field>
		<!-- No "give each transfer its own folder" switch. Every transfer already
		     lands in its own datetime folder, unconditionally, so a switch would
		     offer a choice that does not exist. -->
	</Field.FieldSet>

	<Field.FieldSeparator />

	<Field.FieldSet>
		<Field.FieldLegend>Network</Field.FieldLegend>
		<Field.Field>
			<Field.FieldLabel for="relay">Your own relay</Field.FieldLabel>
			<!-- A host, not prose: no autocorrect, no autocapitalise, and a URL
			     keyboard on touch. The placeholder describes the field rather than
			     imitating a real hostname, which read as a live default. -->
			<Input
				id="relay"
				placeholder="Your relay's address"
				inputmode="url"
				autocomplete="off"
				autocapitalize="none"
				spellcheck="false"
			/>
			<Field.FieldDescription>Leave this empty unless you know you need it.</Field.FieldDescription>
		</Field.Field>
	</Field.FieldSet>
</Field.FieldGroup>
