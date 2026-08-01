<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as Field from '$lib/components/ui/field'
	import { Input } from '$lib/components/ui/input'
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
	<!-- No glyph: lucide carries no brand marks, and a Google button wearing a
	     generic icon is worse than one wearing none. A real logo would have to be
	     an inline SVG under Google's branding rules — worth doing when sign-in is
	     real rather than a disabled stub. -->
	<Button variant="outline" class="w-full" disabled>Continue with Google</Button>
	<Field.FieldDescription class="text-center">
		Accounts are not ready yet. This is just a preview.
	</Field.FieldDescription>
</Field.FieldGroup>
