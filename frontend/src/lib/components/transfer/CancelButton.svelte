<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { IconX } from "@tabler/icons-svelte";

    let { onclick }: { onclick: () => void } = $props();
</script>

<Button
    variant="outline"
    size="sm"
    class="hover:border-destructive hover:bg-transparent hover:text-destructive"
    {onclick}
>
    <IconX />
    Cancel
</Button>
