<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
	import { IconBrandGoogle } from '@tabler/icons-svelte'
</script>

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
