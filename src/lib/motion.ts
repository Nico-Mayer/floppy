import { prefersReducedMotion } from 'svelte/motion'

/**
 * Durations for the JS-driven transitions.
 *
 * app.css already neutralises the CSS keyframe animations under
 * `prefers-reduced-motion`, but Svelte's transition directives are JS and
 * ignore that media query — so they consult it here instead. Collapsing to 0
 * removes the movement while keeping every enter/exit hook intact, so nothing
 * downstream has to branch.
 */
export const motionOK = () => !prefersReducedMotion.current

/** Snappy: hovers, icon swaps, list rows. */
export const fast = () => (motionOK() ? 150 : 0)
/** Standard: panels arriving and leaving. */
export const normal = () => (motionOK() ? 220 : 0)
/** Distance for small directional moves, in pixels. */
export const shift = () => (motionOK() ? 8 : 0)
