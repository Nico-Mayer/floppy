<script lang="ts">
	import * as InputGroup from '$lib/components/ui/input-group'
	import { isCompleteCode, sanitizeCodeInput } from '$lib/code'
	import { cn } from '$lib/utils'
	import XIcon from '@lucide/svelte/icons/x'

	// The canonical `1234-word-word-word` input. Filters keystrokes to characters
	// a code can contain (see sanitizeCodeInput) and calls `onsubmit` on Enter only
	// when the value is a complete code, so unsupported input can neither be typed
	// nor submitted. Callers gate their own button with `isCompleteCode`.
	let {
		value = $bindable(),
		id,
		placeholder = '1234-word-word-word',
		disabled = false,
		class: className,
		onsubmit
	}: {
		value: string
		id?: string
		placeholder?: string
		disabled?: boolean
		class?: string
		onsubmit?: () => void
	} = $props()
</script>

<InputGroup.Root>
	<InputGroup.Input
		{id}
		{placeholder}
		{disabled}
		bind:value
		oninput={() => (value = sanitizeCodeInput(value ?? ''))}
		onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && isCompleteCode(value) && onsubmit?.()}
		class={cn('font-mono', className)}
		autocomplete="off"
		autocapitalize="none"
		spellcheck="false"
		maxlength={32}
	/>
	{#if value}
		<InputGroup.Addon align="inline-end">
			<InputGroup.Button size="icon-xs" onclick={() => (value = '')} aria-label="Clear code">
				<XIcon />
			</InputGroup.Button>
		</InputGroup.Addon>
	{/if}
</InputGroup.Root>
