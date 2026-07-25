<script lang="ts">
    import type { Accent } from "./types";

    let { accent }: { accent: Accent } = $props();

    let tint = $derived(accent === "send" ? "bg-send" : "bg-receive");
    // Ink features read on orange; on cobalt they need the light stroke.
    let stroke = $derived(accent === "send" ? "bg-ink" : "bg-[#f4f5f6]");
</script>

<div class="animate-bob relative h-[58px] w-[72px]" aria-hidden="true">
    <div
        class="border-ink absolute inset-0 rounded-[6px_14px_12px_12px] border-2 {tint}"
    ></div>
    <div
        class="border-ink absolute -top-[9px] left-0 h-3 w-[33px] rounded-[6px_8px_0_0] border-2 {tint}"
    ></div>
    {#if accent === "send"}
        <div class="absolute top-[23px] left-5 size-[7px] rounded-full {stroke}"></div>
        <div class="absolute top-[23px] left-[43px] h-[3px] w-3 rounded-[2px] {stroke}"></div>
        <div
            class="border-ink absolute top-[37px] left-[26px] h-[9px] w-5 rounded-b-xl border-b-2"
        ></div>
    {:else}
        <div class="absolute top-[25px] left-5 h-[3px] w-2 rounded-[2px] {stroke}"></div>
        <div class="absolute top-[25px] left-[43px] h-[3px] w-2 rounded-[2px] {stroke}"></div>
        <div
            class="border-ink absolute top-[35px] left-[29px] size-3.5 rounded-full border-2 bg-[#f4f5f6]"
        ></div>
    {/if}
</div>
