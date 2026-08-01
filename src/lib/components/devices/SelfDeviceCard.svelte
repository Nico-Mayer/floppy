<script lang="ts">
	import DeviceAvatar from '$lib/components/devices/DeviceAvatar.svelte'
	import InlineRename from '$lib/components/InlineRename.svelte'
	import { Button } from '$lib/components/ui/button'
	import { pairing } from '$lib/pairing-app.svelte'
	import PencilIcon from '@lucide/svelte/icons/pencil'

	// This device's own name: the label every other device sees after a pairing.
	// Renaming it is a local write, so this works with or without a connection.
	//
	// Deliberately not shaped like a row in the list below. It used to be an
	// outline Item with a laptop glyph, which is exactly what a paired device looks
	// like, so the first read of the page was "why is my own laptop in my list?".
	// Filled panel, a face seeded by the name rather than a machine glyph, and the
	// label says what the name is *for* instead of naming the section.

	let { editing = $bindable(false) }: { editing?: boolean } = $props()

	let draft = $state('')

	function startEdit() {
		draft = pairing.selfName
		editing = true
	}

	// InlineRename only calls this with a non-empty, trimmed name; an empty one
	// arrives as a cancel instead, since blanking the label is never the intent.
	async function save(name: string) {
		editing = false
		await pairing.setSelfName(name)
	}
</script>

<section class="flex items-center gap-3.5 rounded-2xl bg-muted/60 px-3.5 py-3">
	<!-- Seeded by the name, so renaming this device redraws its face. -->
	<DeviceAvatar name={pairing.selfName} />
	<!-- Both states live in one box that keeps its height: the label-over-name pair
	     and a bare field with two controls do not measure the same, and the panel
	     jumping as you press Rename is the kind of movement that reads as a bug.
	     The floor follows the pointer, because that is what changes the controls'
	     size. -->
	<div class="flex min-h-10 min-w-0 flex-1 items-center gap-2 pointer-coarse:min-h-11">
		{#if editing}
			<InlineRename
				bind:value={draft}
				label="Rename this device"
				maxlength={40}
				class="flex-1"
				onsave={save}
				oncancel={() => (editing = false)}
			/>
		{:else}
			<div class="flex min-w-0 flex-1 flex-col">
				<p class="text-xs text-muted-foreground">Other devices see you as</p>
				<p class="truncate font-medium">{pairing.selfName}</p>
			</div>
			<Button variant="ghost" size="icon" aria-label="Rename this device" onclick={startEdit}>
				<PencilIcon />
			</Button>
		{/if}
	</div>
</section>
