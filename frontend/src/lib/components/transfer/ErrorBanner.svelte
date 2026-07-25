<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { IconAlertCircle, IconX } from "@tabler/icons-svelte";

    let {
        message,
        ondismiss,
    }: {
        message: string;
        ondismiss: () => void;
    } = $props();
</script>

<div
    class="flex w-full items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/10 p-2.5 text-sm text-destructive"
>
    <IconAlertCircle class="size-4 shrink-0" />
    <span class="min-w-0 flex-1 truncate" title={message}>{message}</span>
    <Button variant="ghost" size="icon-xs" onclick={ondismiss} aria-label="Dismiss">
        <IconX />
    </Button>
</div>
