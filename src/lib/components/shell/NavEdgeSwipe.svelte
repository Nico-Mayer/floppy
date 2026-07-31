<script lang="ts">
	import { edgeSwipe } from '$lib/actions/edge-swipe.svelte'
	import { useSidebar } from '$lib/components/ui/sidebar'
	import { isTouch } from '$lib/platform'

	// Wires the left-edge swipe to the sidebar's mobile drawer. Lives inside the
	// provider (so it can reach the sidebar context) but renders nothing — the
	// action binds window listeners and only needs a node to hang its lifecycle on.
	//
	// Gated on pointer coarseness rather than platform: the gesture is about
	// fingers, so a touchscreen laptop gets it too.
	const sidebar = useSidebar()
</script>

<div class="hidden" use:edgeSwipe={{ onOpen: () => sidebar.setOpenMobile(true), enabled: isTouch() }}></div>
