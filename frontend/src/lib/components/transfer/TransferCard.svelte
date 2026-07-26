<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import type { Snippet } from "svelte";
    import type { Accent } from "./types";

    let {
        accent,
        title,
        headline,
        badge,
        children,
    }: {
        accent: Accent;
        title: string;
        headline: string;
        badge: string;
        children: Snippet;
    } = $props();
</script>

<Card.Root class="h-full" size="sm">
    <Card.Header>
        <Card.Title class="flex items-center gap-2">
            <span
                class="size-3 rounded-full {accent === 'send'
                    ? 'bg-send'
                    : 'bg-receive'}"
            ></span>
            {title}
        </Card.Title>
        <Card.Description
            class="font-mono text-[10px] tracking-widest uppercase"
        >
            {headline}
        </Card.Description>
        <Card.Action>
            <span
                class="rounded-md border px-2 py-1 font-mono text-[10px] font-medium tracking-widest uppercase text-muted-foreground"
            >
                {badge}
            </span>
        </Card.Action>
    </Card.Header>
    <Card.Content class="flex min-h-0 flex-1 flex-col gap-3">
        {@render children()}
    </Card.Content>
</Card.Root>
