<script lang="ts">
    import { OpenPath } from "$bindings/bibor/fileservice";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import {
        IconCircleCheckFilled,
        IconDownload,
        IconFolderOpen,
    } from "@tabler/icons-svelte";
    import CancelButton from "./CancelButton.svelte";
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
</script>

<TransferCard accent="receive" busy={status === "receiving"}>
    {#if status === "done"}
        <div class="flex flex-1 flex-col items-center justify-center gap-3">
            <IconCircleCheckFilled class="size-10 text-receive" />
            <p class="text-sm">Received</p>
            <p
                class="max-w-full truncate text-xs text-muted-foreground"
                title={savedTo}
            >
                Saved to {savedTo}
            </p>
        </div>
        <div class="flex flex-col gap-2">
            <Button
                size="sm"
                class="bg-receive text-white hover:bg-receive/90"
                onclick={() => OpenPath(savedTo)}
            >
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
            class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4"
        >
            <div class="flex flex-col items-center gap-1 text-center">
                <IconDownload class="size-8 text-receive" />
                <p class="text-xs text-muted-foreground">
                    Enter the sender's code
                </p>
            </div>
            <div class="flex flex-col gap-2">
                <Input
                    class="text-center font-mono"
                    placeholder="1234-word-word-word"
                    bind:value={code}
                    onkeydown={(e) =>
                        e.key === "Enter" && code.trim() && onstart()}
                />
                <Button
                    class="w-full bg-receive text-white hover:bg-receive/90"
                    onclick={onstart}
                    disabled={!code.trim()}
                >
                    <IconDownload />
                    Receive
                </Button>
            </div>
        </div>
    {/if}
</TransferCard>
