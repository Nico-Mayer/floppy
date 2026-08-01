<script lang="ts">
	import { cn } from '$lib/utils'
	import { funEmoji } from '@dicebear/collection'
	import { createAvatar } from '@dicebear/core'

	// A face for a device, drawn from its name. Same name, same face every time, so
	// the picture is a second way to recognise the device rather than decoration.
	//
	// Rendered by DiceBear locally into a data URI: no request, nothing about the
	// device leaves the machine, and it works with no connection. The hosted API has
	// more styles (`initial-face` among them) but they are not in the npm
	// collection, and a picture is not worth a round trip or a name in someone
	// else's log.
	//
	// `funEmoji` reads at 36px, which is the size this renders at. Swapping it is one
	// import: `bigSmile`, `thumbs`, `funEmoji`, and `toonHead` all hold up small;
	// `lorelei` and `micah` carry detail that muddies at this size.

	let { name, class: className }: { name: string; class?: string } = $props()

	const src = $derived(createAvatar(funEmoji, { seed: name }).toDataUri())
</script>

<span class={cn('flex size-9 shrink-0 overflow-hidden rounded-xl bg-background', className)}>
	<img {src} alt="" class="size-full" />
</span>
