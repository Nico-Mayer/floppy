<script lang="ts">
	import LoginView from '$lib/components/auth/LoginView.svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import * as Field from '$lib/components/ui/field'
	import UserIcon from '@lucide/svelte/icons/user'

	// The one place the account is presented. Phones reach it from the bottom
	// bar, desktop from the sidebar's account row — one way in per platform.
	//
	// The whole screen is a preview (the page header carries the marker from the
	// shared declaration), so no section repeats it. Status is stated in words:
	// the avatar has no image while signed out — a face would misrepresent the
	// empty account, and fetching one from a third party is at odds with the
	// app's peer-to-peer, no-cloud promise — so signed in and out would render
	// the same glyph.
	//
	// Deliberately no editor for this device's name here. That name is the label
	// other devices see after a pairing — a device property, edited on Devices —
	// and a second editor could disagree with the first.
</script>

<section class="flex items-center gap-3.5 rounded-2xl bg-muted/60 px-3.5 py-3">
	<!-- The same glyph the sidebar's account row wears, so signed-out looks the
	     same in every placement. -->
	<Avatar.Root class="size-10 rounded-lg">
		<Avatar.Fallback class="rounded-lg"><UserIcon class="size-5" /></Avatar.Fallback>
	</Avatar.Root>
	<div class="flex min-w-0 flex-1 flex-col">
		<p class="truncate font-medium">Not signed in</p>
		<p class="truncate text-xs text-muted-foreground">Sign in to keep your devices together.</p>
	</div>
</section>

<Field.FieldGroup>
	<Field.FieldSet>
		<Field.FieldLegend>Sign in</Field.FieldLegend>
		<!-- The copy stays scoped to what an account will actually do: carry your
		     paired devices between installs. Files still move device to device, so
		     nothing here promises storage or a cloud. -->
		<Field.FieldDescription>Keep your paired devices in sync across installs.</Field.FieldDescription>
		<LoginView />
	</Field.FieldSet>
</Field.FieldGroup>
