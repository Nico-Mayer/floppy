<script lang="ts">
    import { Progress } from "$lib/components/ui/progress";
    import { IconLoader2 } from "@tabler/icons-svelte";
    import type { Accent } from "./types";

    let {
        accent,
        progress = null,
        label,
    }: {
        accent: Accent;
        progress?: number | null;
        label: string;
    } = $props();
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-4">
    {#if progress !== null}
        <p class="text-4xl font-bold tracking-tight tabular-nums">
            {progress}<span class="text-xl">%</span>
        </p>
        <Progress
            value={progress}
            class="w-2/3 {accent === 'send'
                ? '[&>[data-slot=progress-indicator]]:bg-send'
                : '[&>[data-slot=progress-indicator]]:bg-receive'}"
        />
    {:else}
        <IconLoader2
            class="size-8 animate-spin {accent === 'send'
                ? 'text-send-foreground'
                : 'text-receive-foreground'}"
        />
    {/if}
    <p class="font-mono text-xs text-muted-foreground">{label}</p>
</div>
