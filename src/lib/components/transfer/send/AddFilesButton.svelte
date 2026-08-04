<script lang="ts">
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
	// The button renders on every platform; only the sheet is phone-only. It is the
	// Send screen's one add affordance, which is why the queue grid no longer ends
	// in a dashed add tile: that tile was the *last* grid item, so a long queue
	// carried it off screen exactly when it was wanted. This button does not move.
	//
	// What differs by platform is only what a press opens, and that branch lives in
	// addFiles.start(), not here: the sheet offering files or photos on a phone, the
	// file picker directly everywhere else.
</script>

<!-- Anchored to the trailing bottom corner of the panel's *status* zone, not the
     card: the card's own bottom belongs to the anchored action zone, and a button
     in that corner would land on top of Send. SendPanel supplies the relative box,
     which also keeps this out of the queue's scrolling element so it stays put
     however far the grid is scrolled. The queue pays for the overlap with its own
     bottom padding, on every platform — see SendQueue.
     touch="grow" and size-14: this is the primary way to add files, so it meets the
     hit-area minimum by being big enough to see. -->

<Button
	variant="secondary"
	touch="grow"
	aria-label="Add files"
	class="absolute right-4 bottom-4 z-10 size-14 cursor-pointer rounded-full text-secondary-foreground shadow-lg ring shadow-black/10 ring-border transition-all duration-300 hover:scale-105"
	onclick={() => addFiles.start()}
>
	<PlusIcon class="size-6" />
</Button>

{#if isPhoneChrome}
	<!-- A Drawer rather than a ResponsiveDialog: this surface only ever renders on
	     a phone, so the dialog-or-drawer question is already answered and the
	     indirection would only hide that. Default overlay layer — nothing here is
	     raised unasked, so it has no business on the prompt layer.
	     onAnimationEnd is what lets a row hand off to its native picker only once
	     the sheet is actually gone. -->
	<Drawer.Root bind:open={addFiles.open} onAnimationEnd={(open) => addFiles.settled(open)}>
		<Drawer.Content>
			<!-- Titled, and the title is load-bearing beyond the copy: a dialog with no
			     accessible name is announced as an unnamed dialog, and the primitive
			     warns about it. No description beside it — the two rows below say what
			     the choices are more precisely than a sentence about them would, and
			     aria-describedby is optional where aria-labelledby is not. -->
			<Drawer.Header>
				<Drawer.Title>Add</Drawer.Title>
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

				<!-- "Photos" rather than "Photo library" to sit beside "Files": it is the
				     word every phone puts on the app, and the gallery it opens holds
				     videos too. Same Drawer.Close shape as the row above, for the same
				     reason. -->
				<Drawer.Close
					class={cn(buttonVariants({ variant: 'outline' }), 'h-14 justify-start gap-3 text-base')}
					onclick={() => addFiles.after(() => void app.send.pickPhotos())}
				>
					<ImageIcon class="size-5" />
					Photos
				</Drawer.Close>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
