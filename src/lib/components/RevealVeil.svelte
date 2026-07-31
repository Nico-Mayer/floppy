<script lang="ts">
	import { cn } from '$lib/utils'
	import EyeIcon from '@lucide/svelte/icons/eye'
	import EyeOffIcon from '@lucide/svelte/icons/eye-off'
	import type { Snippet } from 'svelte'

	// Hides something behind a blur until it is asked for, so a secret is not
	// exposed to onlookers or a screen share just by being on screen. The whole
	// surface is the toggle.
	//
	// Hidden is the resting state, which is why the eye is always visible there:
	// on touch there is no hover to discover the control with.

	let {
		/** Whether the content is currently veiled. Bindable so a caller can re-hide it. */
		hidden = $bindable(true),
		/** What is being revealed, for the toggle's accessible name — e.g. "the code". */
		label,
		class: className,
		children
	}: {
		hidden?: boolean
		label: string
		class?: string
		children: Snippet
	} = $props()
</script>

<button
	type="button"
	onclick={() => (hidden = !hidden)}
	aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
	aria-pressed={!hidden}
	class={cn(
		'group/veil relative w-full cursor-pointer rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-ring',
		className
	)}
>
	{@render children()}

	<!-- The veil itself, and the eye that says it can be lifted. Both are
	     pointer-events-none so the press always lands on the button. -->
	<span
		aria-hidden="true"
		class={cn(
			'pointer-events-none absolute inset-0 rounded-4xl backdrop-blur-md transition-opacity duration-200',
			!hidden && 'opacity-0'
		)}
	></span>
	<span
		class={cn(
			'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150',
			!hidden && 'opacity-0 group-hover/veil:opacity-100'
		)}
	>
		<span class="rounded-full bg-background/80 p-2.5 text-foreground shadow-sm backdrop-blur">
			{#if hidden}
				<EyeIcon class="size-5" />
			{:else}
				<EyeOffIcon class="size-5" />
			{/if}
		</span>
	</span>
</button>
