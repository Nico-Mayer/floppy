<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Button } from '$lib/components/ui/button'
	import * as Dialog from '$lib/components/ui/dialog'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { IconBrandGoogle } from '@tabler/icons-svelte'
</script>

<Dialog.Root>
	<Dialog.Trigger
		class="rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	>
		<Avatar.Root class="size-8 ring">
			<Avatar.Image src="https://avatars.githubusercontent.com/u/74204544?v=4" alt="Profile" />
			<Avatar.Fallback>?</Avatar.Fallback>
		</Avatar.Root>
		<span class="sr-only">Account</span>
	</Dialog.Trigger>

	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Sign in</Dialog.Title>
			<Dialog.Description>Accounts aren't available yet — this is a preview.</Dialog.Description>
		</Dialog.Header>

		<!-- UI stub — no submit handler, controls do nothing. -->
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
		</Field.FieldGroup>

		<Field.FieldSeparator>or</Field.FieldSeparator>

		<Button variant="outline" class="w-full" disabled>
			<IconBrandGoogle data-icon="inline-start" />
			Continue with Google
		</Button>
	</Dialog.Content>
</Dialog.Root>
