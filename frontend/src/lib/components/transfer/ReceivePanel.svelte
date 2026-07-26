<script lang="ts">
    import { OpenPath } from "$bindings/bibor/fileservice";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { app } from "$lib/transfer-app.svelte";
    import {
        IconCheck,
        IconDownload,
        IconFolderOpen,
    } from "@tabler/icons-svelte";
    import CancelButton from "./CancelButton.svelte";
    import Mascot from "./Mascot.svelte";
    import TransferCard from "./TransferCard.svelte";
    import TransferProgress from "./TransferProgress.svelte";

    const receive = app.receive;

    let headline = $derived.by(() => {
        switch (receive.status) {
            case "receiving":
                return "receiving";
            case "done":
                return "complete";
            default:
                return "enter code";
        }
    });
    let badge = $derived.by(() => {
        switch (receive.status) {
            case "receiving":
                return receive.progress === null ? "…" : `${receive.progress}%`;
            case "done":
                return "complete";
            default:
                return "idle";
        }
    });
</script>

<TransferCard accent="receive" title="Receive" {headline} {badge}>
    {#if receive.status === "done"}
        <div
            class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
        >
            <div
                class="animate-pop flex size-12 items-center justify-center rounded-full border"
            >
                <IconCheck class="text-receive-foreground size-6" />
            </div>
            <p class="text-base font-bold tracking-tight">Transfer complete</p>
            <p
                class="max-w-full truncate font-mono text-xs text-muted-foreground"
                title={receive.savedTo}
            >
                {receive.savedTo}
            </p>
        </div>
        <div class="flex flex-col gap-2">
            <Button onclick={() => OpenPath(receive.savedTo)}>
                <IconFolderOpen />
                Open folder
            </Button>
            <Button variant="outline" size="sm" onclick={() => receive.reset()}>
                Receive more
            </Button>
        </div>
    {:else if receive.status === "receiving"}
        <TransferProgress
            accent="receive"
            progress={receive.progress}
            label="Receiving…"
        />
        <CancelButton onclick={() => receive.cancel()} />
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
                    bind:value={receive.code}
                    onkeydown={(e) =>
                        e.key === "Enter" &&
                        receive.code.trim() &&
                        receive.start()}
                />
                <Button
                    onclick={() => receive.start()}
                    disabled={!receive.code.trim()}
                >
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
