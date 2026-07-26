<script lang="ts">
    import type { Accent } from "./types";

    let { accent }: { accent: Accent } = $props();

    let tint = $derived(accent === "send" ? "bg-send" : "bg-receive");
    // Ink features read on orange; on cobalt they need the light stroke.
    let stroke = $derived(accent === "send" ? "bg-ink" : "bg-[#f4f5f6]");
</script>

<div class="animate-bob relative h-14.5 w-18" aria-hidden="true">
    <div
        class="border-ink absolute inset-0 rounded-[6px_14px_12px_12px] border-2 {tint}"
    ></div>
    <div
        class="border-ink absolute -top-2.25 left-0 h-3 w-8.25 rounded-[6px_8px_0_0] border-2 {tint}"
    ></div>
    {#if accent === "send"}
        <div
            class="absolute top-5.75 left-5 size-1.75 rounded-full {stroke}"
        ></div>
        <div
            class="absolute top-5.75 left-10.75 h-0.75 w-3 rounded-xs {stroke}"
        ></div>
        <div
            class="border-ink absolute top-9.25 left-6.5 h-2.25 w-5 rounded-b-xl border-b-2"
        ></div>
    {:else}
        <div
            class="absolute top-6.25 left-5 h-0.75 w-2 rounded-xs {stroke}"
        ></div>
        <div
            class="absolute top-6.25 left-10.75 h-0.75 w-2 rounded-xs {stroke}"
        ></div>
        <div
            class="border-ink absolute top-8.75 left-7.25 size-3.5 rounded-full border-2 bg-[#f4f5f6]"
        ></div>
    {/if}
</div>
