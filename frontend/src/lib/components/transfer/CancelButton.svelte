<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { IconX } from "@tabler/icons-svelte";

    let { onclick }: { onclick: () => void } = $props();
</script>

<Button variant="destructive" size="sm" {onclick}>
    <IconX />
    Cancel
</Button>
