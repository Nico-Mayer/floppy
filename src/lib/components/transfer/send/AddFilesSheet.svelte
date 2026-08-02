<script lang="ts">
	import StubMark from '$lib/components/shell/StubMark.svelte'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Drawer from '$lib/components/ui/drawer'
	import { isPhoneChrome } from '$lib/platform'
	import { app } from '$lib/transfer-app.svelte'
	import { cn } from '$lib/utils'
	import FileIcon from '@lucide/svelte/icons/file'
	import ImageIcon from '@lucide/svelte/icons/image'
	import PlusIcon from '@lucide/svelte/icons/plus'
	import { addFiles } from './add-files.svelte'

	// The floating add button and the sheet it opens, together in one component
	// because neither is any use without the other.
	//
	// Phone builds only, and the whole thing renders nothing anywhere else: on a
	// desktop the two idle surfaces can be clicked straight through to the file
	// picker, dragging works, and there is no photo library to reach.
</script>

{#if isPhoneChrome}
	<!-- Anchored to the trailing bottom corner of the panel's *status* zone, not
	     the card: the card's own bottom belongs to the anchored action zone, and a
	     button in that corner would land on top of Send. SendPanel supplies the
	     relative box, which also keeps this out of the queue's scrolling element
	     so it stays put however far the grid is scrolled.
	     touch="grow" and size-14: this is the primary way to add files on a phone,
	     so it meets the hit-area minimum by being big enough to see. -->
	<Button
		size="icon-lg"
		touch="grow"
		aria-label="Add files"
		class="absolute right-2 bottom-2 z-10 size-14 shadow-lg"
		onclick={() => addFiles.start()}
	>
		<PlusIcon class="size-6" />
	</Button>

	<!-- A Drawer rather than a ResponsiveDialog: this surface only ever renders on
	     a phone, so the dialog-or-drawer question is already answered and the
	     indirection would only hide that. Default overlay layer — nothing here is
	     raised unasked, so it has no business on the prompt layer.
	     onAnimationEnd is what lets the Files row hand off to the native picker
	     only once the sheet is actually gone. -->
	<Drawer.Root bind:open={addFiles.open} onAnimationEnd={(open) => addFiles.settled(open)}>
		<Drawer.Content>
			<Drawer.Header>
				<Drawer.Title>Add files</Drawer.Title>
				<Drawer.Description>Pick what you want to send.</Drawer.Description>
			</Drawer.Header>

			<div class="flex flex-col gap-2 px-4 pb-2">
				<!-- Drawer.Close rather than a Button that writes `open = false`, and this
				     is load-bearing: vaul only runs its own close path (and therefore
				     onAnimationEnd) when the close comes from the primitive. Setting the
				     bound prop from outside slides the sheet away but fires no callback,
				     so the picker never opened. Styled with buttonVariants instead of
				     wrapping a Button, since Close already renders the button. -->
				<Drawer.Close
					class={cn(buttonVariants({ variant: 'outline' }), 'h-14 justify-start gap-3 text-base')}
					onclick={() => addFiles.after(() => void app.send.pickFiles())}
				>
					<FileIcon class="size-5" />
					Files
				</Drawer.Close>

				<!-- Not built yet, and not disabled either: a preview control stays
				     operable so its states can be reviewed, and the marker sits on this
				     row rather than on the title because the row above it works. -->
				<Button variant="outline" class="h-14 justify-start gap-3 text-base">
					<ImageIcon class="size-5" />
					Photo library
					<StubMark class="ml-auto" />
				</Button>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
