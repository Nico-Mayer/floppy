<script lang="ts">
	import { edgeSwipe } from '$lib/actions/edge-swipe.svelte'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { isMobile } from '$lib/platform'

	// Wires the left-edge swipe to the sidebar's mobile drawer. Lives inside the
	// provider (so it can reach the sidebar context) but renders nothing — the
	// action binds window listeners and only needs a node to hang its lifecycle on.
	// Enabled on iOS/Android only.
	const sidebar = useSidebar()
</script>

<div class="hidden" use:edgeSwipe={{ onOpen: () => sidebar.setOpenMobile(true), enabled: isMobile }}></div>
