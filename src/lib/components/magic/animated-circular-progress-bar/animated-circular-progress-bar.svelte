<script lang="ts">
	import { cn } from '$lib/utils'
	import type { Snippet } from 'svelte'

	// Vendored from the sv-animations magic registry, with two deliberate patches.
	// Re-adding the block from the registry reverts both, so they are recorded here:
	//
	//  1. `children` — upstream prints the bare rounded number and nothing else.
	//     The readout is a snippet (falling back to that number) so the call site
	//     owns its typography, e.g. digits with a smaller percent sign.
	//  2. `duration` — upstream hard-codes `--transition-length: 1s`, which is far
	//     longer than the gap between transfer progress samples: the arc would trail
	//     a second behind the truth and still be filling after the panel had moved
	//     on. It is a prop now, in seconds, defaulting to upstream's value.

	interface AnimatedCircularProgressBarProps {
		max?: number
		min?: number
		value: number
		gaugePrimaryColor: string
		gaugeSecondaryColor: string
		/** How long the arc takes to travel to a new value, in seconds. */
		duration?: number
		class?: string
		/** The readout inside the ring. Defaults to the rounded percent on its own. */
		children?: Snippet<[number]>
	}

	let {
		max = 100,
		min = 0,
		value = 0,
		gaugePrimaryColor,
		gaugeSecondaryColor,
		duration = 1,
		class: className,
		children
	}: AnimatedCircularProgressBarProps = $props()

	const circumference = 2 * Math.PI * 45
	const percentPx = circumference / 100

	const currentPercent = $derived(Math.round(((value - min) / (max - min)) * 100))
</script>

<div
	class={cn('relative size-40 text-2xl font-semibold', className)}
	style="
    --circle-size: 100px;
    --circumference: {circumference};
    --percent-to-px: {percentPx}px;
    --gap-percent: 5;
    --offset-factor: 0;
    --transition-length: {duration}s;
    --transition-step: 200ms;
    --delay: 0s;
    --percent-to-deg: 3.6deg;
    transform: translateZ(0);
  "
>
	<svg fill="none" class="size-full" stroke-width="2" viewBox="0 0 100 100">
		{#if currentPercent <= 90 && currentPercent >= 0}
			<circle
				cx="50"
				cy="50"
				r="45"
				stroke-width="10"
				stroke-dashoffset="0"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="opacity-100"
				style="
          stroke: {gaugeSecondaryColor};
          --stroke-percent: {90 - currentPercent};
          --offset-factor-secondary: calc(1 - var(--offset-factor));
          stroke-dasharray: calc(var(--stroke-percent) * var(--percent-to-px)) var(--circumference);
          transform: rotate(calc(1turn - 90deg - (var(--gap-percent) * var(--percent-to-deg) * var(--offset-factor-secondary)))) scaleY(-1);
          transition: all var(--transition-length) ease var(--delay);
          transform-origin: calc(var(--circle-size) / 2) calc(var(--circle-size) / 2);
        "
			/>
		{/if}
		<circle
			cx="50"
			cy="50"
			r="45"
			stroke-width="10"
			stroke-dashoffset="0"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="opacity-100"
			style="
        stroke: {gaugePrimaryColor};
        --stroke-percent: {currentPercent};
        stroke-dasharray: calc(var(--stroke-percent) * var(--percent-to-px)) var(--circumference);
        transition: var(--transition-length) ease var(--delay), stroke var(--transition-length) ease var(--delay);
        transition-property: stroke-dasharray, transform;
        transform: rotate(calc(-90deg + var(--gap-percent) * var(--offset-factor) * var(--percent-to-deg)));
        transform-origin: calc(var(--circle-size) / 2) calc(var(--circle-size) / 2);
      "
		/>
	</svg>
	<span
		data-current-value={currentPercent}
		class="absolute inset-0 m-auto size-fit animate-in delay-(--delay) duration-(--transition-length) ease-linear fade-in"
	>
		{#if children}
			{@render children(currentPercent)}
		{:else}
			{currentPercent}
		{/if}
	</span>
</div>
