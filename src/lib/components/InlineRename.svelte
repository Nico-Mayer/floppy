<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import { cn } from '$lib/utils'
	import CheckIcon from '@lucide/svelte/icons/check'
	import XIcon from '@lucide/svelte/icons/x'

	// A name field with cancel and save beside it, used wherever a name is edited
	// in place. Enter saves, Escape cancels, clicking away saves, and an empty name
	// is treated as a cancel rather than saved: blanking a device's label would
	// leave something unidentifiable in the list.
	//
	// The two controls are `size="icon"`, so they grow to 44px on a coarse pointer
	// rather than slop — they sit next to each other, and overlapping hit areas on
	// a save/cancel pair is exactly the kind of adjacency that goes wrong.

	let {
		/** The name being edited. */
		value = $bindable(''),
		/** Accessible name for the field, e.g. "Rename Workshop PC". */
		label,
		maxlength,
		class: className,
		onsave,
		oncancel
	}: {
		value?: string
		label: string
		maxlength?: number
		class?: string
		/** Called with the trimmed name. Not called at all when it is empty. */
		onsave: (name: string) => void
		oncancel: () => void
	} = $props()

	// This only ever mounts in response to someone pressing Rename, so taking focus
	// is finishing that gesture rather than stealing it, and the effect runs once:
	// it reads the element and nothing that changes as you type.
	//
	// Selected rather than merely focused, because the field arrives holding the
	// current name — the common edit is replacing it, and a caret parked at
	// character zero makes the user clear it by hand first. Arrowing or clicking
	// still drops the selection for the rarer tweak-a-few-letters edit.
	let input = $state<HTMLInputElement | null>(null)
	$effect(() => {
		input?.focus()
		input?.select()
	})

	function save() {
		const name = value.trim()
		if (!name) {
			oncancel()
			return
		}
		onsave(name)
	}

	// Clicking or tabbing away commits, the way renaming a file does. Leaving the
	// field open behind a click somewhere else is the thing this fixes: an editor
	// nobody is looking at any more, still holding the row hostage.
	//
	// A focus move to Cancel or Save is not "away" — those two are inside, so they
	// get to say what happens instead.
	let root = $state<HTMLElement | null>(null)
	function onFocusOut(event: FocusEvent) {
		const next = event.relatedTarget
		if (next instanceof Node && root?.contains(next)) return
		save()
	}
</script>

<div bind:this={root} class={cn('flex items-center gap-2', className)} onfocusout={onFocusOut}>
	<Input
		bind:ref={input}
		bind:value
		aria-label={label}
		{maxlength}
		onkeydown={(e: KeyboardEvent) => {
			if (e.key === 'Enter') save()
			if (e.key === 'Escape') oncancel()
		}}
	/>
	<Button variant="ghost" size="icon" aria-label="Cancel rename" onclick={oncancel}>
		<XIcon />
	</Button>
	<Button variant="secondary" size="icon" aria-label="Save name" onclick={save}>
		<CheckIcon />
	</Button>
</div>
