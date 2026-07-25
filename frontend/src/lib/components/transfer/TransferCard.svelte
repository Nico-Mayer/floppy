<script lang="ts">
    import { BorderBeam } from "$lib/components/magic/border-beam";
    import * as Card from "$lib/components/ui/card";
    import type { Snippet } from "svelte";
    import type { Accent } from "./types";

    let {
        accent,
        busy = false,
        children,
    }: {
        accent: Accent;
        busy?: boolean;
        children: Snippet;
    } = $props();
</script>

<Card.Root class="relative h-full overflow-hidden">
    {#if busy}
        <BorderBeam
            size={80}
            duration={5}
            colorFrom="var(--color-{accent})"
            colorTo="var(--color-{accent})"
        />
    {/if}
    <Card.Content class="relative flex h-full min-h-0 flex-col gap-3">
        {@render children()}
    </Card.Content>
</Card.Root>
