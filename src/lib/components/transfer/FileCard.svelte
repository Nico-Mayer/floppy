<script lang="ts">
	import type { FileEntry } from '$lib/ipc'
	import { Button } from '$lib/components/ui/button'
	import FolderIcon from '@lucide/svelte/icons/folder'
	import XIcon from '@lucide/svelte/icons/x'
	import { ext, isPreviewable, previewURL } from './files'
	import { formatBytes } from './format'

	let {
		file,
		onremove
	}: {
		file: FileEntry
		onremove: () => void
	} = $props()

	// Try an inline thumbnail for image files; the glyph underneath stays as the
	// fallback for everything else and for a preview that fails to load (unreadable
	// file, format the webview can't decode). Recording *which* path each outcome
	// belongs to rather than bare flags is what resets them when the tile is reused
	// for a different file — no effect needed.
	let readyPath = $state('')
	let failedPath = $state('')
	const showPreview = $derived(!file.isDir && isPreviewable(file.path) && failedPath !== file.path)
	// A local file still takes a decode (and, for a big image, a read) before it can
	// be painted, which is long enough that an unannounced tile looks broken until
	// the thumbnail appears. The glyph pulses meanwhile.
	const loading = $derived(showPreview && readyPath !== file.path)
</script>

<!-- No enter/exit transition on the tile: the grid's animate:flip is what carries
     removal, and an out-transition defeats it — the leaving tile keeps its grid
     cell for the length of the transition, so the survivors have not moved yet
     when flip measures them, and they jump into place unanimated once it ends.
     That was the inconsistent-looking delete.
     h-full: the grid sizes rows to the tallest tile in the row, and without this
     a short tile would float at the top of its cell instead of filling it. -->
<div
	class="group/tile flex h-full flex-col overflow-hidden rounded-2xl border bg-muted/30 transition-colors hover:border-send/40 hover:bg-muted/60"
>
	<!-- PREVIEW SLOT. Sized by aspect ratio, not a fixed height, so the tile grows
	     and shrinks with its column instead of needing a breakpoint per layout.
	     For image files a thumbnail sits over the placeholder glyph as an
	     absolutely-positioned object-cover <img>; the glyph shows through until
	     it loads and stays put if it fails. -->
	<div class="relative flex aspect-4/3 items-center justify-center bg-muted/40">
		<span
			class="flex size-11 items-center justify-center rounded-xl border bg-background/60 font-mono text-[11px] font-bold"
			class:animate-pulse={loading}
		>
			{#if file.isDir}
				<FolderIcon class="size-5" />
			{:else}
				{ext(file.path)}
			{/if}
		</span>

		{#if showPreview}
			<!-- decoding="async": a full-size image decoded on the main thread stalls
			     the whole window, and nothing here needs the thumbnail synchronously. -->
			<img
				src={previewURL(file.path)}
				alt=""
				loading="lazy"
				decoding="async"
				class="absolute inset-0 size-full object-cover transition-opacity"
				class:opacity-0={loading}
				onload={() => (readyPath = file.path)}
				onerror={() => (failedPath = file.path)}
			/>
		{/if}

		<!-- Revealed on hover or keyboard focus on a fine pointer; always visible on
		     coarse ones, where there is no hover to reveal it with. Translucent
		     backdrop so it stays legible once a thumbnail sits underneath. -->
		<Button
			variant="destructive"
			size="icon-sm"
			class="absolute top-1.5 right-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
			onclick={onremove}
			aria-label="Remove {file.name}"
		>
			<XIcon />
		</Button>
	</div>

	<div class="flex min-w-0 flex-col border-t px-2.5 py-2">
		<p class="truncate text-xs font-medium" title={file.name}>{file.name}</p>
		<p class="font-mono text-[10px] text-muted-foreground tabular-nums">
			{formatBytes(file.size)}
		</p>
	</div>
</div>
