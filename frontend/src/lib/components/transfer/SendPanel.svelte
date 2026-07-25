<script lang="ts">
    import { ShimmerButton } from "$lib/components/magic/shimmer-button";
    import { Button } from "$lib/components/ui/button";
    import {
        IconCheck,
        IconCircleCheckFilled,
        IconCopy,
        IconFile,
        IconLoader2,
        IconPlus,
        IconSend,
        IconUpload,
        IconX,
    } from "@tabler/icons-svelte";
    import { Clipboard } from "@wailsio/runtime";
    import CancelButton from "./CancelButton.svelte";
    import TransferCard from "./TransferCard.svelte";
    import TransferProgress from "./TransferProgress.svelte";
    import type { SendStatus } from "./types";

    let {
        status,
        files = $bindable(),
        code,
        progress,
        onpick,
        onstart,
        oncancel,
        onreset,
    }: {
        status: SendStatus;
        files: string[];
        code: string;
        progress: number;
        onpick: () => void;
        onstart: () => void;
        oncancel: () => void;
        onreset: () => void;
    } = $props();

    let busy = $derived(status !== "idle" && status !== "done");
    let summary = $derived(
        files.length === 1 ? basename(files[0]) : `${files.length} files`,
    );

    function basename(path: string): string {
        return path.split(/[\\/]/).pop() ?? path;
    }

    let copied = $state(false);
    let copyResetTimer: ReturnType<typeof setTimeout>;

    async function copyCode() {
        try {
            // Native clipboard via the Go side — reliable in every webview,
            // unlike navigator.clipboard (secure-context/permission quirks).
            await Clipboard.SetText(code);
        } catch {
            await navigator.clipboard.writeText(code);
        }
        copied = true;
        clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => (copied = false), 2000);
    }
</script>

<TransferCard accent="send" {busy}>
    {#if status === "idle"}
        {#if files.length === 0}
            <button
                type="button"
                onclick={onpick}
                class="flex flex-1 flex-col place-items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-send/25 p-6 text-center text-muted-foreground transition-all hover:cursor-pointer hover:border-send/50 hover:bg-send/5"
            >
                <IconUpload class="size-8 text-send" />
                <span class="text-sm">Choose files or drop them here</span>
            </button>
        {:else}
            <ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {#each files as path (path)}
                    <li
                        class="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/50"
                    >
                        <IconFile class="size-4 shrink-0 text-send" />
                        <div class="flex min-w-0 flex-1 flex-col">
                            <span class="truncate text-sm">{basename(path)}</span>
                            <span
                                class="truncate font-mono text-xs text-muted-foreground"
                                >{path}</span
                            >
                        </div>
                        <Button
                            class="opacity-40 transition-opacity group-hover:opacity-100"
                            variant="ghost"
                            size="icon-xs"
                            onclick={() => (files = files.filter((f) => f !== path))}
                            aria-label="Remove"
                        >
                            <IconX />
                        </Button>
                    </li>
                {/each}
            </ul>
            <div class="flex gap-2">
                <Button variant="outline" onclick={onpick}>
                    <IconPlus />
                    Add
                </Button>
                <ShimmerButton
                    class="h-9 flex-1 gap-2 px-4 py-2 text-sm font-medium text-white"
                    borderRadius="var(--radius-4xl)"
                    background="var(--color-send)"
                    shimmerColor="#ffffff"
                    onclick={onstart}
                >
                    <IconSend />
                    Send {summary}
                </ShimmerButton>
            </div>
        {/if}
    {:else if status === "starting"}
        <TransferProgress accent="send" label="Preparing…" />
    {:else if status === "waiting"}
        <div class="flex flex-1 flex-col items-center justify-center gap-4">
            <button
                type="button"
                onclick={copyCode}
                class="group flex items-center gap-3 rounded-2xl border border-send/30 bg-send/10 px-5 py-3 font-mono text-lg tracking-wide transition-colors hover:cursor-pointer hover:bg-send/20"
                title="Click to copy"
            >
                {code}
                {#if copied}
                    <IconCheck class="size-5 text-send" />
                {:else}
                    <IconCopy
                        class="size-5 text-muted-foreground group-hover:text-foreground"
                    />
                {/if}
            </button>
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <IconLoader2 class="shrink-0 animate-spin text-send" />
                Waiting for receiver…
            </div>
        </div>
        <CancelButton onclick={oncancel} />
    {:else if status === "sending"}
        <TransferProgress accent="send" {progress} label="Sending {summary}" />
        <CancelButton onclick={oncancel} />
    {:else}
        <div class="flex flex-1 flex-col items-center justify-center gap-3">
            <IconCircleCheckFilled class="size-10 text-send" />
            <p class="text-sm">Sent {summary}</p>
        </div>
        <Button variant="outline" size="sm" onclick={onreset}>Send more</Button>
    {/if}
</TransferCard>
