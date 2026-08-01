import { resolve } from '$app/paths'
import { redirect } from '@sveltejs/kit'

// `/` is not a screen: Send and Receive are the two destinations, and the app
// opens on Send. A redirect rather than making `/` *be* Send, so the nav item
// hrefs stay symmetric (`/send` and `/receive`) and the active-state comparison
// has no special case.
//
// Resolves client-side: ssr = false in +layout.ts, under adapter-static's SPA
// fallback.
export const load = () => {
	redirect(307, resolve('/send'))
}
