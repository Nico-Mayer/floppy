<script lang="ts">
	import { Button, type ButtonProps } from '$lib/components/ui/button'
	import { Spinner } from '$lib/components/ui/spinner'

	// The one busy-button treatment (`feedback`): while `pending`, the button
	// disables itself against a second press and swaps its content for an inline
	// spinner beside the pending label. Composes the shared Button rather than
	// patching it, so the vendored primitive stays stock.
	let {
		pending = false,
		pendingLabel,
		disabled,
		children,
		...rest
	}: ButtonProps & { pending?: boolean; pendingLabel: string } = $props()
</script>

<Button {...rest} disabled={disabled || pending}>
	{#if pending}
		<Spinner data-icon="inline-start" />
		{pendingLabel}
	{:else}
		{@render children?.()}
	{/if}
</Button>
