<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
	import { mode } from "mode-watcher";
	import { IconLoader } from '@tabler/icons-svelte';
	import { IconCircleCheck } from '@tabler/icons-svelte';
	import { IconAlertOctagon } from '@tabler/icons-svelte';
	import { IconInfoCircle } from '@tabler/icons-svelte';
	import { IconAlertTriangle } from '@tabler/icons-svelte';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme={mode.current}
	class="toaster group"
	style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
	{...restProps}
>
	{#snippet loadingIcon()}
		<IconLoader class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<IconCircleCheck class="size-4" />
	{/snippet}
	<!-- The icon carries the toast's type, since the surface stays a popover for
	     every one of them (no richColors) — same amber/destructive pairing the
	     panels already use for warnings and failures. -->
	{#snippet errorIcon()}
		<IconAlertOctagon class="size-4 text-destructive" />
	{/snippet}
	{#snippet infoIcon()}
		<IconInfoCircle class="size-4 text-muted-foreground" />
	{/snippet}
	{#snippet warningIcon()}
		<IconAlertTriangle class="size-4 text-amber-500" />
	{/snippet}
</Sonner>
