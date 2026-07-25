<script lang="ts">
    import { OpenPath } from "$bindings/bibor/fileservice";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import {
        IconCheck,
        IconDownload,
        IconFolderOpen,
    } from "@tabler/icons-svelte";
    import CancelButton from "./CancelButton.svelte";
    import Mascot from "./Mascot.svelte";
    import TransferCard from "./TransferCard.svelte";
    import TransferProgress from "./TransferProgress.svelte";
    import type { ReceiveStatus } from "./types";

    let {
        status,
        progress,
        savedTo,
        code = $bindable(),
        onstart,
        oncancel,
        onreset,
    }: {
        status: ReceiveStatus;
        progress: number | null;
        savedTo: string;
        code: string;
        onstart: () => void;
        oncancel: () => void;
        onreset: () => void;
    } = $props();

    let headline = $derived(
        status === "receiving"
            ? "receiving"
            : status === "done"
              ? "complete"
              : "enter code",
    );
    let badge = $derived(
        status === "receiving"
            ? progress !== null
                ? `${progress}%`
                : "…"
            : status === "done"
              ? "complete"
              : "idle",
    );
</script>

<TransferCard accent="receive" title="Receive" {headline} {badge}>
    {#if status === "done"}
        <div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div
                class="animate-pop flex size-12 items-center justify-center rounded-full border"
            >
                <IconCheck class="text-receive-foreground size-6" />
            </div>
            <p class="text-base font-bold tracking-tight">Transfer complete</p>
            <p
                class="max-w-full truncate font-mono text-xs text-muted-foreground"
                title={savedTo}
            >
                {savedTo}
            </p>
        </div>
        <div class="flex flex-col gap-2">
            <Button onclick={() => OpenPath(savedTo)}>
                <IconFolderOpen />
                Open folder
            </Button>
            <Button variant="outline" size="sm" onclick={onreset}>
                Receive more
            </Button>
        </div>
    {:else if status === "receiving"}
        <TransferProgress accent="receive" {progress} label="Receiving…" />
        <CancelButton onclick={oncancel} />
    {:else}
        <div
            class="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 text-center"
        >
            <Mascot accent="receive" />
            <p class="text-lg font-bold tracking-tight">Enter transfer code</p>
            <p class="max-w-64 text-xs text-muted-foreground">
                Paste the four-word code the sender gave you.
            </p>
            <div class="mt-1 flex w-full flex-col gap-2">
                <Input
                    class="text-center font-mono"
                    placeholder="1234-word-word-word"
                    bind:value={code}
                    onkeydown={(e) =>
                        e.key === "Enter" && code.trim() && onstart()}
                />
                <Button onclick={onstart} disabled={!code.trim()}>
                    <IconDownload />
                    Receive files
                </Button>
                <p class="font-mono text-xs text-muted-foreground">
                    saves to ~/Downloads
                </p>
            </div>
        </div>
    {/if}
</TransferCard>
