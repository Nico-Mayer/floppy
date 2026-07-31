import { MediaQuery } from 'svelte/reactivity'

// The navigation's own threshold, and only that: below it the sidebar is a
// drawer, at or above it the sidebar is a fixed icon rail. Nothing else should
// read this.
//
// It is 768 (Tailwind `md`) while the content breakpoint in `$lib/platform` is
// 640 (`sm`), and that difference is deliberate. "Is there room for a permanent
// rail beside the content" is a different question from "should content go
// full-bleed": between 640 and 768 the content is already wide enough for the
// desktop card, but a rail would eat too much of it. Moving either threshold to
// match the other would move where the rail appears.
//
// The name stays `IsMobile` because this file and the sidebar that consumes it
// both come from the shadcn-svelte registry and can be re-fetched. For the
// three signals the app itself branches on, see `$lib/platform`.

const DEFAULT_MOBILE_BREAKPOINT = 768

export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${breakpoint - 1}px`)
	}
}
